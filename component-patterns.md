# Patrones de Componentes y Estados de Página

Toda página debe cubrir 5 estados. Aquí están los patrones con código práctico.

## Loading — Skeleton loaders

```tsx
// components/features/SkeletonCard.tsx
export function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-4 rounded-lg border p-4">
      <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-20 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
```

## Empty — Sin datos

> **Regla Zero Raw HTML**: `EmptyState` y `ErrorState` deben usar `<Typography />` y `<Button />` de shadcn/ui en lugar de `<h3>`, `<p>` y `<button>` raw. Ver [Estándares de Diseño](/estandares-diseno.md).

```tsx
// components/features/EmptyState.tsx
interface EmptyStateProps {
  title?: string;
  description?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function EmptyState({
  title = "No hay elementos",
  description = "Crea tu primer elemento para empezar",
  ctaLabel = "Crear elemento",
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="mb-4 h-16 w-16 text-slate-400" ... />
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {onCtaClick && (
        <button
          onClick={onCtaClick}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
```

## Error — Con reintento

```tsx
export function ErrorState({
  message = "Algo salió mal",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <p className="text-error mb-2 font-medium">{message}</p>
      <p className="mb-4 text-sm text-slate-500">
        Intenta de nuevo o contacta a soporte.
      </p>
      <button
        onClick={onRetry}
        className="rounded-md bg-error px-4 py-2 text-white hover:bg-error/90"
      >
        Reintentar
      </button>
    </div>
  );
}
```

## Success — Toast de confirmación

```tsx
// Usando shadcn toast
import { toast } from "@/components/ui/use-toast";

export function confirmarAccion(mensaje: string) {
  toast({
    title: "Operación exitosa",
    description: mensaje,
    variant: "success", // custom variant
  });
}
```

## Edge cases — Datos parciales y listas de 1 elemento

```tsx
// ProductList.tsx - maneja null, undefined, arrays vacíos y de 1 elemento
export function ProductList({ products }: { products: Product[] | null }) {
  if (!products) return <SkeletonCard />;
  if (products.length === 0) return <EmptyState />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
```

## Responsive design — Mobile-first con sidebar/bottom nav

```tsx
// components/layout/AppLayout.tsx
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Sidebar: visible en md+ */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r md:block">
        <Sidebar />
      </aside>
      {/* Bottom nav: visible solo en mobile */}
      <nav className="fixed inset-x-0 bottom-0 border-t bg-white md:hidden">
        <BottomNav />
      </nav>
      {/* Contenido principal */}
      <main className="pb-16 md:ml-64 md:pb-0">{children}</main>
    </div>
  );
}
```

**Breakpoints:** `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`. Siempre diseña para mobile primero y agrega variantes `sm:`, `md:`, etc.

## Referencias

- [Estándares de Diseño](/estandares-diseno.md) — regla Zero Raw HTML: usar `<Typography />` y `<Button />` de shadcn/ui
- [Error Handling](/error-handling.md) — `ErrorState` se usa como fallback en Error Boundary (Capa 4)
- [Animaciones](/animaciones.md) — añadir animaciones de entrada a `EmptyState` y `SkeletonCard`
- [Errores al Usuario](/errores-usuario.md) — mapeo de errores técnicos a mensajes amigables para `ErrorState`
