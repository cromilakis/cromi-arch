# 🔤 Fontsource: Fuentes self-hosted

## ¿Por qué?

Google Fonts agrega una petición HTTP externa que impacta en **LCP** (hasta +300ms) y envía datos de usuarios a Google. Fontsource elimina ambos problemas.

## Cómo funciona

Cada fuente es un paquete npm que se instala y se importa como CSS. El navegador no hace peticiones externas, las fuentes viajan en el bundle.

## Instalación

```bash
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

## Uso

```tsx
// app/layout.tsx
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
```

Sin configuración adicional. Las clases `font-sans` y `font-mono` de Tailwind ya apuntan a las variables CSS que Fontsource define.

## Tailwind v4 config

Con Tailwind CSS v4 (CSS-first), las fuentes se registran en `globals.css` con `@theme`. No se necesita `tailwind.config.ts` para tokens de tipografía:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --font-sans: 'Inter Variable', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', monospace;
}
```

Tailwind genera automáticamente las clases `font-sans` y `font-mono` a partir de estas variables.

## En nuestro stack

| Elemento | Antes (Google Fonts) | Ahora (Fontsource) |
|----------|---------------------|--------------------|
| **Body** | Google Fonts CDN | `@fontsource-variable/inter` |
| **Código** | Google Fonts CDN | `@fontsource-variable/jetbrains-mono` |
| **Peticiones extra** | 2 HTTP externas | 0 |
| **LCP impact** | +100-300ms | 0 |
| **Privacidad** | Datos a Google | 100% local |
| **Offline** | No | Sí |

## Fontsource vs Google Fonts

| Aspecto | Google Fonts CDN | Fontsource |
|---------|-----------------|------------|
| Performance | Petición HTTP externa bloquea render | Sin peticiones extra |
| Privacidad | Envía IP/user-agent a Google | Sin tracking |
| Offline | No funciona sin internet | Funciona siempre |
| Versiones | Controladas por Google | Pinneadas en package.json |
| Bundle | Variable, depende de caché | ~15KB woff2 por fuente |

## Referencias

- GitHub: https://github.com/fontsource/fontsource
- npm: `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`
- Docs: https://fontsource.org/docs/getting-started
- [Design System](/design-system.md) — fuentes declaradas en `@theme` de globals.css
- [Performance Budget](/performance-budget.md) — eliminar peticiones externas mejora LCP
