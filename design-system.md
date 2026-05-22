# Sistema de Diseño y Librería UI

> ⚠️ **Regla Zero Raw HTML**: Todo elemento de UI debe ser un componente. Ver [Estándares de Diseño](/estandares-diseno.md#regla-fundamental-zero-raw-html) para las reglas completas.

## shadcn/ui como librería base

shadcn/ui no es un paquete npm tradicional — se instala vía CLI y copia los componentes directamente en tu proyecto. Esto te da control total sobre el código.

```bash
npx shadcn@latest init          # Inicializar configuración
npx shadcn@latest add button card dialog toast   # Agregar componentes
```

Configuración base (`components.json`):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## Tailwind CSS v4 — Configuración CSS-first

Tailwind CSS v4 usa un enfoque CSS-first. Las fuentes se instalan vía Fontsource (self-hosted, sin Google Fonts CDN):

```bash
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #0f172a;
  --color-primary-foreground: #f8fafc;
  --color-secondary: #64748b;
  --color-secondary-foreground: #f8fafc;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --font-sans: "Inter", "system-ui", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

### Modo oscuro con next-themes

```tsx
// app/providers.tsx
"use client";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

Uso: `dark:bg-slate-900 dark:text-slate-100` en cada componente.

## Radix UI Primitives

shadcn/ui está construido sobre **Radix UI** — primitivas headless accesibles. Los componentes de shadcn son wrappers de Radix con estilos de Tailwind.

Radix UI proporciona:
- `@radix-ui/react-dialog` → shadcn `Dialog`
- `@radix-ui/react-dropdown-menu` → shadcn `DropdownMenu`
- `@radix-ui/react-popover` → shadcn `Popover`
- `@radix-ui/react-toast` → shadcn `Toast`

## Design Tokens con CSS Variables

Los design tokens se definen como variables CSS personalizadas. shadcn/ui usa el patrón `--color-*`:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --primary: oklch(0.205 0.042 265.755);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0.001 286.375);
  --muted: oklch(0.965 0.001 286.375);
  --accent: oklch(0.965 0.001 286.375);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0.004 286.375);
  --input: oklch(0.922 0.004 286.375);
  --ring: oklch(0.205 0.042 265.755);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0.042 265.755);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0.042 265.755);
  --secondary: oklch(0.269 0.015 286.375);
  /* ... más variables */
}
```

## Tipografía

| Elemento | Clase | Uso |
|----------|-------|-----|
| Heading 1 | `scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl` | Título principal |
| Heading 2 | `scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0` | Secciones |
| Heading 3 | `scroll-m-20 text-2xl font-semibold tracking-tight` | Sub-secciones |
| Lead | `text-xl text-muted-foreground` | Descripción |
| Large | `text-lg font-semibold` | Texto destacado |
| Body | `text-base leading-7` | Texto normal |
| Muted | `text-sm text-muted-foreground` | Texto secundario |
| Mono | `font-mono text-sm` | Código |

## Estructura de carpetas

```
components/
├── ui/          # shadcn/ui (button, card, dialog, toast)
├── layout/      # Sidebar, Navbar, Footer, BottomNav
└── features/    # Componentes de negocio (UserCard, ProductList)
```

Para customizar un componente de shadcn, edita directamente el archivo en `components/ui/`. Ejemplo: cambiar el `variant` del botón agregando un nuevo estilo.

## Referencias

- [Estándares de Diseño](/estandares-diseno.md) — regla Zero Raw HTML y principios de diseño
- [Component Patterns](/component-patterns.md) — patrones de estados de página usando este design system
- [Animaciones](/animaciones.md) — micro-interacciones con Motion integradas en componentes shadcn/ui
- [i18n](/i18n.md) — el componente Typography integra traducciones con `next-intl`
