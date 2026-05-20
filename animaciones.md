# Animaciones y Micro-interacciones

> INVESTIGADO: Motion (framer-motion) docs oficiales (motion.dev), Tailwind CSS v4 animation utilities.

## Motion (antes Framer Motion)

Motion es la biblioteca de animación para React (antes llamada Framer Motion). Usa un motor híbrido que corre animaciones nativamente con Web Animations API y fallback a JavaScript para spring physics.

```bash
npm install motion
```

Importación actual:

```tsx
import { motion } from "motion/react";
```

## Transiciones suaves con Tailwind

Las utilidades `transition-all`, `duration-300` y `ease-in-out` cubren el 90% de los casos.

```tsx
// Botón con hover suave
<button className="transform rounded-md bg-primary px-4 py-2 text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-primary/50 active:scale-95">
  Guardar cambios
</button>
```

```tsx
// Sidebar colapsable con transición de ancho
<aside
  className={`transition-all duration-500 ease-in-out ${
    isOpen ? "w-64" : "w-16"
  } overflow-hidden`}
>
  {/* contenido */}
</aside>
```

## Motion — Animaciones complejas

### Fade-in al cargar página

```tsx
// components/features/PageFadeIn.tsx
"use client";
import { motion } from "framer-motion"; // o "motion/react"

export function PageFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

**Nota:** Usar `import { motion } from "framer-motion"` sigue funcionando (compatibilidad hacia atrás). Para proyectos nuevos se recomienda `import { motion } from "motion/react"`.

### Lista con entrada escalonada (stagger)

```tsx
<motion.ul variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
  {items.map((item) => (
    <motion.li
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      animate="visible"
    >
      {item.nombre}
    </motion.li>
  ))}
</motion.ul>
```

### Animaciones de entrada con whileInView

Motion soporta animaciones activadas por scroll con `whileInView`:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true }}
>
  Contenido animado al hacer scroll
</motion.div>
```

### Hover y tap con whileHover / whileTap

```tsx
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
>
  Interactivo
</motion.button>
```

### Page transitions con Next.js App Router

```tsx
// app/layout.tsx
"use client";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <html>
      <body>
        <AnimatePresence mode="wait" key={pathname}>
          {children}
        </AnimatePresence>
      </body>
    </html>
  );
}
```

## Animaciones de salida con AnimatePresence

Motion permite animar elementos al salir del DOM mediante `exit`:

```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      Contenido del modal
    </motion.div>
  )}
</AnimatePresence>
```

## Animaciones de layout con layout prop

Motion detecta cambios de layout y anima transiciones suavemente:

```tsx
<motion.div layout>
  {/* Elemento animado al cambiar tamaño/posición */}
</motion.div>
```

## Cuándo animar y cuándo NO

**Animamos en:** hover, focus, entrada de página, reordenamiento de listas, feedback de acciones (like, delete), scroll-triggered.

**NO animamos en:** producción si el usuario prefiere `prefers-reduced-motion`.

```tsx
// Respetar preferencias del usuario con CSS global
```

```css
/* app/globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Motion también implementa esto automáticamente. No es necesario usar `useReducedMotion()` en Motion v12+ — el motor respeta `prefers-reduced-motion` por defecto. Si necesitas control explícito:

```tsx
import { useReducedMotion } from "motion/react";

function MiComponente() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    >
      Contenido
    </motion.div>
  );
}
```

## Loading states animados con Tailwind

```tsx
<div className="flex items-center gap-3">
  {/* Spinner */}
  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
  {/* Pulse */}
  <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
  {/* Bounce */}
  <div className="h-3 w-3 animate-bounce rounded-full bg-primary" />
  <span className="text-sm text-slate-500">Cargando...</span>
</div>
```

Usa `animate-spin` para loaders circulares, `animate-pulse` para skeletons, y `animate-bounce` solo para micro-interacciones lúdicas (no para loading crítico).

## Buenas prácticas de performance

1. Prefiere `transform` y `opacity` para animaciones (no disparan layout)
2. Usa `will-change` solo cuando sea necesario
3. Evita animar `width`, `height`, `top`, `left` — usa `scale` y `translate`
4. En listas largas, usa `layout` solo donde sea necesario
5. Para animaciones simples, prefiere CSS transitions sobre Motion
