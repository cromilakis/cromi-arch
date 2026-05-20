# Arquitectura de Componentes

> INVESTIGADO: Next.js Server/Client Components docs, feature-based architecture patterns.

> Este documento define cómo organizamos y construimos componentes en Next.js App Router.

## Feature-based Organization

No agrupamos por tipo (`components/`, `hooks/`, `utils/`). Agrupamos por **feature**.

```
src/
  features/
    auth/
      components/     # Componentes específicos de auth
      hooks/          # Custom hooks de auth
      schemas/        # Zod schemas de auth
      actions.ts      # Server Actions de auth
    products/
      components/     # Lista, card, form de producto
      api/            # Route handlers de producto
  components/         # Solo componentes **reutilizables** entre features
  ui/                 # Componentes de UI atómicos (Button, Input, Modal)
  lib/                # Utilidades globales (db, email, stripe)
```

- `features/<feature>/` → Componentes, hooks, lógica específica de una feature.
- `components/` → Componentes compartidos entre 2+ features (ej. `<AuthGuard />`).
- `ui/` → Componentes puramente visuales sin lógica de negocio (ej. `<Button />`, `<Input />`).
- `lib/` → Configuraciones, clientes (Prisma, Stripe, Resend).

## Server Components vs Client Components

| Tipo | Server Component | Client Component |
|------|-----------------|------------------|
| `'use client'` | No | Sí |
| Fetch de datos | ✅ Directo | ❌ (usar TanStack Query) |
| useState/useEffect | ❌ | ✅ |
| Acceso a DB | ✅ | ❌ |
| Bundle size | Cero JS | Incluye JS |

```tsx
// ✅ Server Component — fetch directo, cero JS enviado
export default async function ProductList() {
  const products = await db.product.findMany();
  return products.map(p => <ProductCard key={p.id} product={p} />);
}

// ✅ Client Component — solo cuando necesitas interactividad
'use client';
export function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  return <button onClick={() => addToCart(productId)}>Añadir</button>;
}
```

**Regla general:** Por defecto Server Component. Usa `'use client'` solo si necesitas interactividad del navegador.

## Composición vs Props Drilling

Evita pasar `props` a través de 3+ niveles. Usa composición:

```tsx
// ❌ Props drilling: Page → Layout → Sidebar pasa userId
// ✅ Composición: Page pasa directamente a Sidebar
export default async function Page({ params }) {
  return (
    <Layout>
      <Sidebar userId={(await params).id} />
      <Main>
        <ProductGrid />
      </Main>
    </Layout>
  );
}
```

## Patrones Clave

- **Data Fetching:** Server Components + TanStack Query para revalidación.
- **Formularios:** React Hook Form + Zod schema en Server Actions.
- **Estado global:** Zustand para UI state (theme, sidebar), TanStack Query para server state.
