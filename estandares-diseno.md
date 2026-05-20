# 🎨 Estándares de Diseño y Design System

## ⚠️ Regla fundamental: Zero Raw HTML

**En esta arquitectura no existe HTML puro.** Todo elemento de UI debe ser un componente. Esto incluye:

| HTML prohibido | Reemplazo obligatorio |
|----------------|----------------------|
| `<h1>`, `<h2>`, `<p>`, `<span>` | `<Typography as="h1" />` |
| `<button>` | `<Button />` de shadcn/ui |
| `<input>`, `<select>`, `<textarea>` | `<Input />`, `<Select />`, `<Textarea />` de shadcn/ui |
| `<div>` como contenedor | `<Card />`, `<Panel />` o componente layout |
| `<label>` | `<Label />` de shadcn/ui |
| `<img>` | `<Image />` de shadcn/ui o next/image |
| `<a>` | `<Link />` de Next.js o `<Button variant="link" />` |
| `<form>` | React Hook Form + Zod + shadcn/ui |

### Reglas asociadas

| # | Regla | Explicación |
|---|-------|-------------|
| 1 | **No HTML puro** | Cualquier elemento visual debe ser un componente. `<h1>Texto</h1>` no existe. Solo `<Typography as="h1">Texto</Typography>` |
| 2 | **No inline styles** | `style={{ color: 'red' }}` prohibido. Todo via clases Tailwind. Si necesitas un color que no existe, es porque falta un token |
| 3 | **No valores hardcodeados** | Colores, espaciado, tipografía solo desde tokens CSS. `text-primary` sí. `text-#ff0000` no |
| 4 | **Tema configurable** | Paleta de colores, fuentes, radios y espaciados se definen en `globals.css` como CSS variables. Cambiando las variables, cambia todo el tema |
| 5 | **shadcn/ui es la fuente de UI** | No crees un botón nuevo. Usa el `<Button />` de shadcn. Si necesitas variantes, extiende el componente existente |
| 6 | **i18n en tipografía** | Todo texto visible debe pasar por i18n. `<Typography as="h1" i18nKey="home.title" />` o `t('home.title')` dentro del componente |

## Typography Component (con i18n integrado)

El componente `Typography` es el único responsable de renderizar texto. Nunca `<p>`, `<h1>`, `<span>` directamente.

```tsx
// components/ui/typography.tsx
import { useTranslations } from 'next-intl'

type TypographyAs = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'lead' | 'large' | 'small' | 'muted' | 'code'

interface TypographyProps {
  as: TypographyAs
  i18nKey?: string           // clave de traducción
  values?: Record<string, any>  // valores para interpolación
  children?: React.ReactNode    // o texto directo
  className?: string
}

export function Typography({ as, i18nKey, values, children, className }: TypographyProps) {
  const t = useTranslations()
  const content = i18nKey ? t(i18nKey, values) : children

  const styles: Record<TypographyAs, string> = {
    h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
    h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
    h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
    h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
    p: 'text-base leading-7 [&:not(:first-child)]:mt-6',
    lead: 'text-xl text-muted-foreground',
    large: 'text-lg font-semibold',
    small: 'text-sm font-medium leading-none',
    muted: 'text-sm text-muted-foreground',
    code: 'font-mono text-sm bg-muted px-1.5 py-0.5 rounded',
    span: '',
  }

  const Tag = as === 'lead' || as === 'large' || as === 'small' || as === 'muted' || as === 'code' ? 'span' : as
  return <Tag className={cn(styles[as], className)}>{content}</Tag>
}
```

Uso:

```tsx
// ✅ Correcto
<Typography as="h1" i18nKey="home.welcome" />
<Typography as="p">Hola mundo</Typography>
<Typography as="muted" className="mt-2">Última actualización: hoy</Typography>

// ❌ Prohibido
<h1 className="text-4xl font-bold">Bienvenido</h1>
<p style={{ color: 'red' }}>Error</p>
<span className="text-sm">Texto</span>
```

## Stack de diseño

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Estilos** | Tailwind CSS v4 | Utility-first, tokens, responsive |
| **Componentes base** | shadcn/ui + Radix UI | Componentes accesibles y customizables |
| **Iconos** | Lucide React | Iconos consistentes, tree-shakeable |
| **Fuentes** | Inter (texto), JetBrains Mono (código) | Legibilidad, rendimiento |
| **Modo oscuro** | next-themes | Tema claro/oscuro sin flickering |
| **Animaciones** | Tailwind animations + Framer Motion | Micro-interacciones |
| **Formularios** | React Hook Form + Zod + shadcn/ui | UI consistente con validación |

## Principios del diseño

1. **Utility-first con tokens**: los estilos se definen en `tailwind.config.ts` y se usan como clases, nunca CSS custom
2. **Componentes atómicos en shadcn/ui**: botones, inputs, modales vienen de shadcn, se customizan via CSS variables
3. **Feature components sobre shadcn**: los componentes de negocio usan shadcn por debajo pero encapsulan lógica
4. **Mobile-first responsive**: breakpoints de Tailwind, navegación adaptable
5. **Accesibilidad nativa**: Radix UI maneja ARIA, keyboard navigation, focus management
6. **Modo oscuro por CSS variables**: `var(--color-background)` en vez de `dark:` en cada clase

## Design Tokens (CSS Variables)

Los tokens se definen en `globals.css` y se consumen desde Tailwind:

```css
/* globals.css - tokens globales */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --destructive: 0 84.2% 60.2%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
  }
}
```

Y se mapean en `tailwind.config.ts`:

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
```

## Escala de espaciado y tipografía

```ts
// Escala de espaciado consistente (Tailwind tiene esta escala por defecto)
// px-0.5 → 0.125rem (2px)
// px-1 → 0.25rem (4px)
// px-2 → 0.5rem (8px)
// px-3 → 0.75rem (12px)
// px-4 → 1rem (16px)   ← base
// px-6 → 1.5rem (24px)
// px-8 → 2rem (32px)
// px-12 → 3rem (48px)
// px-16 → 4rem (64px)

// Escala tipográfica
// text-xs → 0.75rem (12px)  - captions, metadata
// text-sm → 0.875rem (14px) - body small, labels
// text-base → 1rem (16px)   - body text
// text-lg → 1.125rem (18px) - lead
// text-xl → 1.25rem (20px)  - subheadings
// text-2xl → 1.5rem (24px)  - h3
// text-3xl → 1.875rem (30px) - h2
// text-4xl → 2.25rem (36px) - h1
```

## Estructura de componentes

```
src/
├── components/
│   ├── ui/              ← shadcn/ui (instalados, no modificar)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── layout/          ← Layouts reutilizables
│   │   ├── sidebar.tsx
│   │   ├── navbar.tsx
│   │   ├── mobile-nav.tsx
│   │   └── page-container.tsx
│   └── features/        ← Componentes de negocio (feature-based)
│       ├── auth/
│       │   ├── login-form.tsx
│       │   └── register-form.tsx
│       └── dashboard/
│           ├── stats-card.tsx
│           └── activity-feed.tsx
├── hooks/               ← Custom hooks
├── lib/                 ← Utilidades
└── app/                 ← Next.js App Router pages
```

## Integración con la arquitectura

### Server Components → Client Components

```
Server Component (app/page.tsx)
  ├── Renderiza datos desde Prisma/API
  ├── Sin interactividad, sin hooks
  └── Client Component (componente interactivo)
       ├── 'use client'
       ├── TanStack Query para data fetching
       └── shadcn/ui + React Hook Form
```

### Carga de datos y estados de UI

Cada página feature debe tener:

```tsx
// 1. Server Component para datos iniciales
export default async function ProductsPage() {
  const products = await prisma.product.findMany({ take: 20 })
  return <ProductList initialData={products} />
}

// 2. Client Component para interactividad + estados
'use client'
function ProductList({ initialData }: { initialData: Product[] }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
    initialData,
  })

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />
  if (!data?.length) return <EmptyState
    title="Sin productos"
    cta={{ label: "Crear producto", href: "/products/new" }}
  />

  return data.map(product => <ProductCard key={product.id} product={product} />)
}
```

## Reglas de diseño

| Regla | Explicación |
|-------|-------------|
| No CSS custom | Todo con Tailwind + shadcn/ui. Si necesitas CSS extra, es porque falta un token |
| Colores solo de tokens | `bg-primary` OK. `bg-blue-500` solo en casos excepcionales |
| shadcn/ui es la fuente de verdad | Botones, inputs, modales, tabs, etc. vienen de shadcn |
| Componente de feature ≠ componente de UI | Un `login-form` usa `<Input />` de shadcn, no es un input nuevo |
| Dark mode automático | next-themes + CSS variables en `globals.css`. No usar `dark:` manual |
| Responsive mobile-first | Construir para mobile primero, extend con `md:`, `lg:` |
| Un componente por archivo | Export default, nombre = filename |
