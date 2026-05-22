# Implementación de Búsqueda

## PostgreSQL Full-Text Search con pg_trgm + tsvector

### Configuración de Extensiones

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Modelo Prisma con Índices

```prisma
model Producto {
  id          String @id @default(cuid())
  nombre      String
  descripcion String
  precio      Float

  @@index([nombre], type: BTree)
  @@index([nombre, descripcion], type: BTree)
}
```

Para usar índices GIST/GIN con pg_trgm, ejecutar migración raw:

```sql
-- prisma/migrations/<id>_add_search_index/migration.sql
CREATE INDEX idx_producto_trgm ON "Producto" USING GIN ("nombre" gin_trgm_ops);
```

## Consulta de Búsqueda en Prisma

```typescript
// lib/search.ts
export async function searchProducts(query: string) {
  const results = await prisma.$queryRaw<Producto[]>`
    SELECT *,
      similarity(nombre, ${query}) AS rank
    FROM "Producto"
    WHERE nombre ILIKE ${'%' + query + '%'}
       OR descripcion ILIKE ${'%' + query + '%'}
    ORDER BY rank DESC
    LIMIT 20
  `;

  return results;
}
```

## Ranking y Relevancia

| Factor | Peso | Implementación |
|--------|------|---------------|
| Coincidencia exacta en nombre | Alta | `nombre ILIKE query` + ORDER BY |
| Coincidencia parcial | Media | `%query%` con pg_trgm similarity |
| Coincidencia en descripción | Baja | Menor peso en el scoring |

Para ranking más avanzado con tsvector:

```typescript
const results = await prisma.$queryRaw`
  SELECT *,
    ts_rank(
      to_tsvector('spanish', nombre || ' ' || descripcion),
      plainto_tsquery('spanish', ${query})
    ) AS rank
  FROM "Producto"
  WHERE to_tsvector('spanish', nombre || ' ' || descripcion) @@ plainto_tsquery('spanish', ${query})
  ORDER BY rank DESC
`;
```

## Búsqueda Fuzzy con pg_trgm

Para tolerar errores tipográficos:

```typescript
export async function fuzzySearch(query: string) {
  const results = await prisma.$queryRaw`
    SELECT *,
      similarity(nombre, ${query}) AS rank
    FROM "Producto"
    WHERE similarity(nombre, ${query}) > 0.3
    ORDER BY rank DESC
    LIMIT 10
  `;
  return results;
}
```

## Patrón de Input con Debounce

```typescript
// components/SearchInput.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export function SearchInput() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce de 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => fetch(`/api/search?q=${debouncedQuery}`).then(r => r.json()),
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar productos..."
        className="w-full px-4 py-2 border rounded-lg"
      />
      {results && (
        <ul className="absolute top-full left-0 right-0 bg-white border rounded-b-lg shadow-lg">
          {results.data?.map((producto: any) => (
            <li key={producto.id} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
              {producto.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```
