# 🌓 Transición de Tema (claro/oscuro)

## View Transitions API

La técnica usa la **View Transitions API** nativa del navegador combinada con **máscaras SVG** (`mask`) y `clip-path` animados vía CSS.

El JavaScript necesario es mínimamente simple — solo **2 líneas**:

```js
if (!document.startViewTransition) switchTheme()
document.startViewTransition(switchTheme)
```

Luego toda la animación se define en CSS. El repositorio [rudrodip/theme-toggle-effect](https://github.com/rudrodip/theme-toggle-effect) y su [demo interactiva](https://theme-toggle.rdsx.dev) muestran todas las variantes.

---

## Efectos disponibles

### 1. Círculo (circular mask)

Máscara circular que se expande desde el centro.

```css
::view-transition-group(root) {
  animation-timing-function: var(--expo-out);
}
::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: none;
  animation-fill-mode: both;
  z-index: -1;
}
::view-transition-new(root) {
  mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="white"/></svg>') center / 0 no-repeat;
  animation: scale 1s;
  animation-fill-mode: both;
}
@keyframes scale {
  to { mask-size: 200vmax; }
}
```

### 2. Círculo con blur

Igual que el anterior pero con desenfoque gaussiano en el borde.

```css
::view-transition-group(root) {
  animation-timing-function: var(--expo-out);
}
::view-transition-new(root) {
  mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="20" cy="20" r="18" fill="white" filter="url(%23blur)"/></svg>') center / 0 no-repeat;
  animation: scale 1s;
  animation-fill-mode: both;
}
::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: none;
  animation-fill-mode: both;
  z-index: -1;
}
.dark::view-transition-new(root) {
  animation: scale 1s;
  animation-fill-mode: both;
}
@keyframes scale {
  to { mask-size: 200vmax; }
}
```

### 3. Círculo desde esquina superior izquierda

Variante que cambia el punto de origen de la animación.

```css
::view-transition-group(root) {
  animation-timing-function: var(--expo-out);
}
::view-transition-new(root) {
  mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="0" cy="0" r="18" fill="white" filter="url(%23blur)"/></svg>') top left / 0 no-repeat;
  mask-origin: content-box;
  animation: scale 1s;
  animation-fill-mode: both;
  transform-origin: top left;
}
::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: scale 1s;
  animation-fill-mode: both;
  transform-origin: top left;
  z-index: -1;
}
@keyframes scale {
  to { mask-size: 350vmax; }
}
```

### 4. Polígono (clip-path)

Revelado mediante `clip-path` con forma de polígono diagonal.

```css
::view-transition-group(root) {
  animation-duration: 0.7s;
  animation-timing-function: var(--expo-out);
}
::view-transition-new(root) {
  animation-name: reveal-light;
  animation-fill-mode: both;
}
::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: none;
  animation-fill-mode: both;
  z-index: -1;
}
.dark::view-transition-new(root) {
  animation-name: reveal-dark;
  animation-fill-mode: both;
}
@keyframes reveal-dark {
  from { clip-path: polygon(50% -71%, -50% 71%, -50% 71%, 50% -71%); }
  to   { clip-path: polygon(50% -71%, -50% 71%, 50% 171%, 171% 50%); }
}
@keyframes reveal-light {
  from { clip-path: polygon(171% 50%, 50% 171%, 50% 171%, 171% 50%); }
  to   { clip-path: polygon(171% 50%, 50% 171%, -50% 71%, 50% -71%); }
}
```

> **Nota:** `clip-path` no permite gradientes ni desenfoque. Para efectos más complejos, usa SVG mask.

### 5. Gradiente con SVG personalizado

Máscara SVG avanzada con degradado lineal usando un archivo local `assets/custom-svg.svg`.

```css
::view-transition-group(root) {
  animation-timing-function: var(--expo-out);
}
::view-transition-new(root) {
  mask: url('assets/custom-svg.svg') top left / 0 no-repeat;
  mask-origin: top left;
  animation: scale 1.5s;
  animation-fill-mode: both;
}
::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: scale 1.5s;
  animation-fill-mode: both;
  z-index: -1;
  transform-origin: top left;
}
@keyframes scale {
  to { mask-size: 200vmax; }
}
```

### 6. GIF como máscara

Usa un GIF animado como máscara de transición. La animación escala desde 0 hasta cubrir la pantalla.

```css
::view-transition-group(root) {
  animation-timing-function: var(--expo-in);
}
::view-transition-new(root) {
  mask: url('https://media.tenor.com/cyORI7kwShQAAAAi/shigure-ui-dance.gif') center / 0 no-repeat;
  animation: scale 3s;
  animation-fill-mode: both;
}
::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: scale 3s;
  animation-fill-mode: both;
}
@keyframes scale {
  0%   { mask-size: 0; }
  10%  { mask-size: 50vmax; }
  90%  { mask-size: 50vmax; }
  100% { mask-size: 2000vmax; }
}
```

---

## Timing functions recomendadas

El repositorio proporciona dos curvas easing personalizadas optimizadas para transiciones de tema:

```css
:root {
  --expo-in: linear(
    0 0%, 0.0085 31.26%, 0.0167 40.94%,
    0.0289 48.86%, 0.0471 55.92%, 0.0717 61.99%,
    0.1038 67.32%, 0.1443 72.07%, 0.1989 76.7%,
    0.2659 80.89%, 0.3465 84.71%, 0.4419 88.22%,
    0.554 91.48%, 0.6835 94.51%, 0.8316 97.34%, 1 100%
  );
  --expo-out: linear(
    0 0%, 0.1684 2.66%, 0.3165 5.49%,
    0.446 8.52%, 0.5581 11.78%, 0.6535 15.29%,
    0.7341 19.11%, 0.8011 23.3%, 0.8557 27.93%,
    0.8962 32.68%, 0.9283 38.01%, 0.9529 44.08%,
    0.9711 51.14%, 0.9833 59.06%, 0.9915 68.74%, 1 100%
  );
}
```

---

## Integración con next-themes (nuestro stack)

> **Regla Zero Raw HTML**: en producción usar `<Button variant="ghost" size="icon">` de shadcn/ui en lugar de `<button>` raw. Ver [Estándares de Diseño](/estandares-diseno.md).

```tsx
'use client'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  const handleClick = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    if (!document.startViewTransition) {
      setTheme(nextTheme)
      return
    }
    document.startViewTransition(() => setTheme(nextTheme))
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} aria-label="Cambiar tema">
      {resolvedTheme === 'dark' ? '☀️' : '🌙'}
    </Button>
  )
}
```

> **Importante:** el JavaScript es solo eso. No necesitas calcular coordenadas del clic ni animaciones programáticas. Toda la animación se define en CSS. El navegador se encarga del resto.

---

## Compatibilidad

| Navegador | Soporte |
|-----------|---------|
| Chrome 111+ | ✅ Completo (mask + clip-path + pseudoElement) |
| Edge 111+ | ✅ Completo |
| Firefox 121+ | ⚠️ Soporte básico (sin pseudoElement) |
| Safari 18+ | ⚠️ Soporte básico (sin pseudoElement) |
| Opera | ✅ Completo |

Cuando no hay soporte, el toggle cambia el tema sin animación (graceful degradation).

---

## Código completo en Docsify

El sitio docsify ya usa este patrón. Ver `index.html` para la implementación en vivo:

https://docs-arquitectura.vercel.app

---

## Referencias

- [View Transitions API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Smooth transitions — Chrome Developers](https://developer.chrome.com/docs/web-platform/view-transitions)
- [rudrodip/theme-toggle-effect](https://github.com/rudrodip/theme-toggle-effect) — Repositorio con todos los efectos
- [Demo interactiva](https://theme-toggle.rdsx.dev) — Prueba los efectos en vivo
- [Estándares de Diseño](/estandares-diseno.md) — regla Zero Raw HTML: usar `<Button />` de shadcn/ui
- [Animaciones](/animaciones.md) — micro-interacciones complementarias con Motion
