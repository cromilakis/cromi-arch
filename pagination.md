# Paginación API

> Estrategias de paginación para listas en la API REST.

## Cursor-Based Pagination (Recomendado)

Ideal para listas grandes y en tiempo real. Usa un cursor (ID único) para navegar páginas. No se salta ni duplica registros si hay inserciones.

```ts
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');   // ID del último item
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

  const products = await db.product.findMany({
    take: limit + 1,             // Pedimos uno extra para saber si hay más
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,        // Skip el cursor mismo
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = products.length > limit;
  const data = hasMore ? products.slice(0, limit) : products;

  return NextResponse.json({
    data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  });
}
```

**Formato de respuesta:**

```json
{
  "data": [ { "id": "abc123", "name": "Producto 1" }, ... ],
  "nextCursor": "xyz789",
  "hasMore": true
}
```

## Offset-Based Pagination

Usar solo para listas pequeñas/estáticas (admin panels, catálogos fijos).

```ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;

  const [data, total] = await Promise.all([
    db.product.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.product.count(),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

## Frontend con TanStack Query + Infinite Scroll

```tsx
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';

async function fetchProducts({ pageParam }: { pageParam: string | null }) {
  const params = pageParam ? `&cursor=${pageParam}` : '';
  const res = await fetch(`/api/products?limit=20${params}`);
  return res.json();
}

export function ProductList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['products'],
      queryFn: fetchProducts,
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    });

  return (
    <div>
      {data?.pages.map((page) =>
        page.data.map((product: any) => (
          <div key={product.id}>{product.name}</div>
        ))
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
        </button>
      )}
    </div>
  );
}
```

## Cuadro Comparativo

| Aspecto | Cursor | Offset |
|---------|--------|--------|
| Consistencia en tiempo real | Alta | Baja (saltos/duplicados) |
| Rendimiento (gran volumen) | Excelente | Degrada con OFFSET grande |
| Saltar a página X | No | Sí |
| Complejidad | Media | Baja |
| Ideal para | Feeds, timelines, scroll infinito | Tablas admin, paginación numérica |

## Referencias

- [Database Patterns](/database-patterns.md) — cursor y offset pagination en Prisma con ejemplos de índices
- [Búsqueda](/busqueda.md) — paginar resultados de búsqueda full-text
- [Performance Budget](/performance-budget.md) — latencia P50 ≤ 200ms como target para endpoints paginados
