# Estrategia de Caché

## TanStack Query (React Query)

Configuración global de staleTime y gcTime (TanStack Query v5+):

```typescript
// app/providers/QueryProvider.tsx
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 min: datos frescos (no refetch)
      gcTime: 1000 * 60 * 30,      // 30 min: datos inactivos en caché
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

> **Nota sobre gcTime:** En TanStack Query v5, `cacheTime` se renombró a `gcTime` (garbage collection time). Controla cuánto tiempo se mantienen los datos de queries inactivas (sin componentes suscritos) antes de ser eliminados. El default es 5 minutos. gcTime solo aplica a queries que ya no tienen observadores activos.

| Recurso | staleTime | gcTime | Motivo |
|---------|-----------|--------|--------|
| Lista de usuarios | 30 seg | 5 min | Datos cambian frecuentemente |
| Configuración | 10 min | 1 hora | Cambia raramente |
| Sesión del usuario | 0 (siempre fresca) | 30 min | Seguridad |

## Next.js ISR (Incremental Static Regeneration)

Para páginas públicas con contenido que cambia ocasionalmente:

```typescript
// app/productos/[slug]/page.tsx
export const revalidate = 3600; // Re-generar cada hora

export default async function ProductoPage({ params }: { params: { slug: string } }) {
  const producto = await prisma.producto.findUnique({
    where: { slug: params.slug },
  });

  return <main>
    <h1>{producto.nombre}</h1>
    <p>{producto.descripcion}</p>
  </main>;
}
```

## CDN Caching Headers

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Assets estáticos: caché largo
  if (request.nextUrl.pathname.startsWith('/_next/static')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Páginas públicas: caché corto
  if (request.nextUrl.pathname.startsWith('/productos')) {
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=60');
  }

  // Datos de API sensibles: no cachear
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return response;
}
```

## Redis / Upstash para Caché Adicional

Cuando TanStack Query no es suficiente (datos compartidos entre usuarios):

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getCachedProduct(slug: string) {
  const cached = await redis.get(`product:${slug}`);
  if (cached) return JSON.parse(cached as string);

  const product = await prisma.producto.findUnique({ where: { slug } });
  await redis.set(`product:${slug}`, JSON.stringify(product), { ex: 3600 });
  return product;
}
```

## Cache Invalidation

| Evento | Acción |
|--------|--------|
| Usuario actualiza perfil | `queryClient.invalidateQueries({ queryKey: ['user', id] })` |
| Admin crea producto | Revalidar ISR: `revalidatePath('/productos')` |
| Stripe webhook (pago) | Invalidar suscripción en caché de Redis |
| Despliegue | CDN cache purged automáticamente por Vercel |

## Referencias

- [Rate Limiting](/decisiones/rate-limiting.md) — comparte la instancia Upstash Redis
- [Estrategia .env](/decisiones/env-strategy.md) — variables `UPSTASH_REDIS_REST_URL/TOKEN`
- [Performance Budget](/performance-budget.md) — caching como herramienta para cumplir los targets de latencia
- [Error Handling](/error-handling.md) — manejar fallos de caché (Redis caído) sin romper la app
