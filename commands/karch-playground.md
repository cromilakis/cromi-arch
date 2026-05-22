# karch-playground — Playground-First Component Development

## Philosophy

Every reusable UI element is born in the playground, evolved in the playground, and corrected in the playground. Pages never contain raw HTML presentation elements — they only reference playground components through their props.

The playground is a living page inside the project (typically `src/app/[locale]/playground/page.tsx`) that grows alongside the application. Each new control is built, validated, and documented there before being used anywhere else.

## The rule — non-negotiable

**No raw HTML presentation elements are allowed directly in page or layout JSX.**

Elements that must NEVER appear directly in pages:
```
h1, h2, h3, h4, h5, h6
p, span, strong, em, blockquote
button, a (as interactive element)
input, select, textarea, label, form
ul, ol, li (when used for UI, not content)
div, section (when used for styled layout containers)
img (use Next.js <Image> component via playground wrapper)
hr, badge, tag, pill (any visual indicator)
```

If it carries visual meaning or could be reused across two or more screens → it belongs in the playground.

## Decision flow — apply before writing any UI code

```
Does the component exist in the playground?
  │
  ├── YES → Use it with its existing props
  │          Need a new variant? → Go to playground first, add the variant, then use it
  │
  └── NO  → 1. Create the component in src/components/ui/ or src/components/<domain>/
             2. Add it to the playground page with all its variants and states
             3. Validate visually in the browser at /playground
             4. Only then reference it from the page
```

## Playground page structure

```tsx
// src/app/[locale]/playground/page.tsx
// This page is the source of truth for all UI components in this project.
// Add every new component here with all its variants before using it anywhere.

export default function PlaygroundPage() {
  return (
    <div className="p-8 space-y-12">

      <section>
        <Typography variant="h2">Typography</Typography>
        <Typography variant="h1">Heading 1</Typography>
        <Typography variant="h2">Heading 2</Typography>
        <Typography variant="h3">Heading 3</Typography>
        <Typography variant="body">Body text paragraph</Typography>
        <Typography variant="caption">Caption / helper text</Typography>
      </section>

      <section>
        <Typography variant="h2">Buttons</Typography>
        <div className="flex gap-4 flex-wrap">
          <Button variant="default">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button isLoading>Loading</Button>
        </div>
      </section>

      {/* Add new sections here as components are created */}
    </div>
  )
}
```

## Component file conventions

```
src/
  components/
    ui/           ← shadcn/ui base components (generated, do not edit directly)
    primitives/   ← project-level wrappers and extensions of shadcn/ui
      Typography.tsx
      Button.tsx     ← extends shadcn Button with project-specific variants
      ...
    <domain>/     ← composite components that use primitives
      UserCard.tsx
      PaymentSummary.tsx
```

**Extending shadcn/ui components:**
```tsx
// src/components/primitives/Typography.tsx
import { cn } from '@/lib/utils'

const variants = {
  h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
  h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
  h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
  body: 'leading-7',
  caption: 'text-sm text-muted-foreground',
} as const

type Variant = keyof typeof variants

interface Props {
  variant: Variant
  className?: string
  children: React.ReactNode
}

const tags: Record<Variant, keyof JSX.IntrinsicElements> = {
  h1: 'h1', h2: 'h2', h3: 'h3', body: 'p', caption: 'span',
}

export function Typography({ variant, className, children }: Props) {
  const Tag = tags[variant]
  return <Tag className={cn(variants[variant], className)}>{children}</Tag>
}
```

## Phase integration

| Phase | What to do |
|-------|-----------|
| **Phase 3** | For every component in the architecture, verify it exists in the playground or plan its creation. Add "playground entry" to the task list for each new component. |
| **Phase 5** | Before implementing any page, run the decision flow above. No exceptions. |
| **Phase 7** | Audit: grep for forbidden raw HTML in page/layout files. Zero tolerance. |

## Verification — run before closing any UI task

```bash
# Check for raw HTML presentation elements in pages and layouts
# (excludes playground itself and ui/ primitives)
grep -rn \
  -e "<h[1-6]" \
  -e "<button" \
  -e "<input" \
  -e "<select" \
  -e "<textarea" \
  -e "<p " -e "<p>" \
  src/app/ \
  --include="*.tsx" \
  | grep -v playground \
  | grep -v ".test."
```

Any output from this grep is a violation. Each line must be replaced with the corresponding playground component before the task is closed.

## Gate

Before marking any UI task as done:
- [ ] Every text element uses `<Typography variant="...">` or equivalent primitive — no `<h1>`, `<p>`, `<span>` in pages
- [ ] Every interactive element uses a primitive from `src/components/primitives/` — no `<button>` in pages
- [ ] Every new component added to pages also has an entry in `playground/page.tsx`
- [ ] The grep above returns zero violations
- [ ] The playground is viewable at `/playground` and shows all variants

## Error signals
- `<h1>` or `<button>` found in a page file: replace with the Typography or Button primitive immediately
- Component exists in a page but not in the playground: add it to the playground before closing the task
- Playground does not exist in the project: scaffold it as the first task of Phase 5 for any UI feature — it is a prerequisite, not optional
- New variant added directly in a page via `className` override without updating the primitive: extract the variant to the component definition
