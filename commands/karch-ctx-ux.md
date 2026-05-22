# karch-ctx-ux — UX, Design System & Frontend Patterns

Invoke this skill when working on any UI feature. Contains the complete rules for components, design tokens, typography, forms, animations, icons and i18n.

---

## Zero Raw HTML Rule (non-negotiable)

No raw HTML elements exist in this codebase. Every UI element is a component.

| Prohibited | Required replacement |
|------------|---------------------|
| `<h1>` `<h2>` `<p>` `<span>` | `<Typography as="h1" />` |
| `<button>` | `<Button />` from shadcn/ui |
| `<input>` `<select>` `<textarea>` | `<Input />` `<Select />` `<Textarea />` from shadcn/ui |
| `<div>` as container | `<Card />` `<Panel />` or layout component |
| `<label>` | `<Label />` from shadcn/ui |
| `<img>` | `<Image />` from next/image |
| `<a>` | `<Link />` from Next.js or `<Button variant="link" />` |
| `<form>` | React Hook Form + Zod + shadcn/ui |

Additional rules:
- No inline styles (`style={{ color: 'red' }}`) — everything via Tailwind classes
- No hardcoded colors or spacing — only CSS tokens (`bg-primary`, `text-foreground`)
- No `dark:` class manually — dark mode via CSS variables in `globals.css`
- All visible text through i18n — no hardcoded strings in JSX

---

## Design Stack

| Component | Technology |
|-----------|-----------|
| Styles | Tailwind CSS v4 (CSS-first, `@theme` in globals.css) |
| Base components | shadcn/ui + Radix UI (accessible, customizable) |
| Icons | Lucide React (default) + Iconify (fallback) |
| Fonts | Inter (text), JetBrains Mono (code) via Fontsource |
| Dark mode | next-themes + CSS variables |
| Animations | Tailwind transitions + Motion (`import { motion } from "motion/react"`) |
| Forms | React Hook Form + Zod + shadcn/ui |

---

## Typography Component

The `Typography` component is the only way to render text. Never use `<p>`, `<h1>`, `<span>` directly.

```tsx
// components/ui/typography.tsx
<Typography as="h1" i18nKey="home.welcome" />
<Typography as="p">Content here</Typography>
<Typography as="muted" className="mt-2">Secondary text</Typography>

// Variants: h1 h2 h3 h4 p lead large small muted code span
```

Typography styles map:
- `h1` → `scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl`
- `h2` → `scroll-m-20 text-3xl font-semibold tracking-tight`
- `p` → `text-base leading-7 [&:not(:first-child)]:mt-6`
- `muted` → `text-sm text-muted-foreground`
- `lead` → `text-xl text-muted-foreground`

---

## Design Tokens (globals.css)

```css
@import "tailwindcss";

@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222.2 84% 4.9%);
  --color-primary: hsl(221.2 83.2% 53.3%);
  --color-primary-foreground: hsl(210 40% 98%);
  --color-destructive: hsl(0 84.2% 60.2%);
  --radius: 0.5rem;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

.dark {
  --color-background: hsl(222.2 84% 4.9%);
  --color-foreground: hsl(210 40% 98%);
}
```

Tailwind auto-generates `bg-background`, `text-foreground`, `bg-primary`, `font-sans`, etc.

---

## Component Architecture

```
src/
├── components/
│   ├── ui/          ← shadcn/ui (edit directly to customize)
│   ├── layout/      ← Sidebar, Navbar, Footer, BottomNav, PageContainer
│   └── features/    ← Business components (feature-based)
│       ├── auth/
│       └── dashboard/
├── hooks/           ← Custom hooks
└── app/             ← Next.js App Router pages
```

Feature-based organization — group by domain, not by file type:
```
src/features/
  auth/
    components/    ← auth-specific components
    hooks/         ← auth-specific hooks
    schemas/       ← Zod schemas for auth
    actions.ts     ← Server Actions for auth
```

---

## Server vs Client Components

| | Server Component | Client Component |
|-|-----------------|------------------|
| `'use client'` | No | Yes |
| Data fetch | ✅ Direct from Prisma | ❌ Use TanStack Query |
| useState/useEffect | ❌ | ✅ |
| DB access | ✅ | ❌ |
| Bundle size | Zero JS | Includes JS |

**Rule:** Default to Server Component. Use `'use client'` only when you need browser interactivity.

```tsx
// Server Component — data from Prisma, zero JS sent
export default async function ProductsPage() {
  const products = await prisma.product.findMany({ take: 20 })
  return <ProductList initialData={products} />
}

// Client Component — interactivity + TanStack Query
'use client'
function ProductList({ initialData }) {
  const { data, isLoading, error } = useQuery({ ... initialData })
  if (error) return <ErrorState message={error.message} onRetry={refetch} />
  if (!data?.length) return <EmptyState title="No products" cta={{ label: "Create", href: "/new" }} />
  return data.map(p => <ProductCard key={p.id} product={p} />)
}
```

---

## 5 States — Every Page Must Handle All

Every page/list component must handle:

| State | Component |
|-------|-----------|
| `loading` | `<SkeletonCard />` — `animate-pulse` skeleton |
| `empty` | `<EmptyState title description cta />` |
| `error` | `<ErrorState message onRetry />` |
| `success` | The happy path content |
| `edge case` | Boundary conditions (1 item, max items, partial data) |

```tsx
// Pattern for every data-driven component
if (!data) return <SkeletonCard />
if (error) return <ErrorState message={error.message} onRetry={refetch} />
if (data.length === 0) return <EmptyState title="No items" description="Create your first one" />
return <ItemGrid items={data} />
```

---

## Responsive Layout (mobile-first)

```tsx
// AppLayout.tsx — sidebar on md+, bottom nav on mobile
<div className="min-h-screen bg-white dark:bg-slate-950">
  <aside className="fixed inset-y-0 left-0 hidden w-64 border-r md:block">
    <Sidebar />
  </aside>
  <nav className="fixed inset-x-0 bottom-0 border-t bg-white md:hidden">
    <BottomNav />
  </nav>
  <main className="pb-16 md:ml-64 md:pb-0">{children}</main>
</div>
```

Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`. Always mobile-first.

---

## Forms (React Hook Form + Zod + shadcn/ui)

```tsx
// 1. Shared Zod schema (src/validations/register.ts)
export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
})

// 2. Client form with zodResolver
const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
  resolver: zodResolver(registerSchema),
})

// 3. Use shadcn/ui Form + FormField + FormMessage for complex forms
// Use InputField component (Label + Input + error) for simple forms

// 4. Server-side validation with same schema (never trust client alone)
const parsed = registerSchema.safeParse(await req.json())
if (!parsed.success) return Response.json({ error: 'Invalid', code: 'VALIDATION_ERROR' }, { status: 400 })
```

---

## i18n (next-intl)

```tsx
// Server Component
const t = await getTranslations('HomePage')
return <Typography as="h1">{t('title')}</Typography>

// Client Component
const t = useTranslations('auth')
return <Button>{t('login')}</Button>

// Message files: messages/es.json, messages/en.json
// TypeScript autocomplete: declare interface IntlMessages extends typeof import('./messages/es.json') {}
```

Routing with locale prefix: `app/[locale]/layout.tsx` + `middleware.ts` with `createMiddleware({ locales: ['es', 'en'], defaultLocale: 'es' })`.

---

## Animations (Motion)

```tsx
import { motion } from "motion/react"  // not "framer-motion" for new projects

// Page fade-in
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

// Stagger list
<motion.ul variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
  <motion.li variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>

// Exit animation
<AnimatePresence>
  {isVisible && <motion.div key="modal" exit={{ opacity: 0, scale: 0.9 }}>}
</AnimatePresence>
```

**Rules:**
- Animate `transform` and `opacity` only (no `width`, `height`, `top`, `left`)
- Always respect `prefers-reduced-motion` (Motion v12+ does this automatically)
- Simple transitions → Tailwind (`transition-all duration-300`). Complex → Motion.

---

## Icons

Priority order:
1. **Lucide React** (included with shadcn/ui) — `import { User, Settings } from 'lucide-react'`
2. **Iconify** (if Lucide doesn't have it) — `import { Icon } from '@iconify/react'` → `<Icon icon="logos:github-icon" />`
3. Search at **icones.js.org** to find the icon name

Always use `className="size-4"` (Tailwind) for sizing — never `width` and `height` props.

---

## shadcn/ui Setup

```bash
npx shadcn@latest init
# components.json: style=new-york, rsc=true, tsx=true, cssVariables=true
npx shadcn@latest add button card dialog toast input label
```

Customize by editing `components/ui/*.tsx` directly — shadcn copies code into your project.
