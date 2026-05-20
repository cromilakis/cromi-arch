# Database Design Patterns con Prisma

Patrones para escribir queries eficientes y seguras con Prisma + PostgreSQL.

## N+1 Query Prevention

El problema N+1 ocurre cuando haces una query y luego una query adicional por cada resultado.

### ❌ Mal (N+1)

```typescript
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } });
  // 1 query para users + N queries para posts
}
```

### ✅ Bien (Eager loading con `include`)

```typescript
const users = await prisma.user.findMany({
  include: { posts: true },         // 1 JOIN query
});
```

### ✅ Mejor (Solo los campos que necesitas con `select`)

```typescript
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    posts: { select: { id: true, title: true } },
  },
});
```

### ✅ Batch loading para casos complejos

```typescript
const postIds = [1, 2, 3];
const posts = await prisma.post.findMany({
  where: { id: { in: postIds } },
  include: { author: { select: { id: true, name: true } } },
});
// 1 query con WHERE id IN (...)
```

## Paginación

### Offset pagination — para listas pequeñas o paginación aleatoria

```typescript
const posts = await prisma.post.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

**Usar cuando:** el usuario puede saltar a cualquier página (paginación clásica 1,2,3…).

### Cursor pagination — para infinite scroll o datos en tiempo real

```typescript
const posts = await prisma.post.findMany({
  take: limit + 1,                    // pedimos uno de más para detectar si hay siguiente
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,               // saltamos el cursor mismo
  orderBy: { id: 'asc' },
});

const hasNextPage = posts.length > limit;
const nextCursor = hasNextPage ? posts[limit - 1]?.id : null;
const items = posts.slice(0, limit);
```

**Usar cuando:** infinite scroll, feeds, o necesitas estabilidad aunque se inserten registros nuevos.

## Indexing Strategy

### Qué indexar

| Columna                        | Tipo de índice       | Razón                                    |
|-------------------------------|----------------------|------------------------------------------|
| `email` (único)               | `@unique`            | Búsqueda por login                       |
| `userId` en tablas hijas      | `@index`             | JOIN frecuente                           |
| `createdAt` (ordenamiento)    | `@index`             | ORDER BY frecuente                       |
| `status` + `createdAt`        | `@@index([status, createdAt])` | Filtro compuesto                 |
| `slug`, `stripeCustomerId`    | `@unique`            | Búsqueda por identificador externo       |

### Schema Prisma con índices

```prisma
model Order {
  id           String   @id @default(cuid())
  userId       String
  status       OrderStatus
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id])

  @index([userId])
  @index([status, createdAt])
  @index([createdAt])
}
```

### Cómo detectar queries lentas

```bash
# Habilitar log de queries lentas en PostgreSQL
docker compose exec postgres psql -c "ALTER SYSTEM SET log_min_duration_statement = 200;"
```

O desde Prisma:

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 200) {
    logger.warn('Slow query', { query: e.query, duration: e.duration });
  }
});
```

## Raw queries seguras

Prisma protege contra SQL injection cuando usas parámetros con `$queryRawUnsafe` o `$queryRaw`:

### ❌ Inseguro (concatenación de strings)

```typescript
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

### ✅ Seguro (template literal con Prisma)

```typescript
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
```

### ✅ Seguro con `$queryRawUnsafe` usando parámetros

```typescript
await prisma.$queryRawUnsafe(
  'SELECT * FROM users WHERE email = $1 AND status = $2',
  email,
  status,
);
```

## Transaction patterns

Usa **interactive transactions** para operaciones que involucran múltiples tablas:

```typescript
import { prisma } from '@/lib/prisma';

export async function createOrderWithItems(userId: string, items: CartItem[]) {
  return prisma.$transaction(async (tx) => {
    // 1. Calcular total
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    // 2. Crear orden
    const order = await tx.order.create({
      data: { userId, total, status: 'PENDING' },
    });

    // 3. Crear items de la orden
    for (const item of items) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.qty,
          price: item.price,
        },
      });
    }

    // 4. Descontar stock
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.qty } },
      });
    }

    return order;
  });
}
```

La transacción se revierte automáticamente si cualquier paso falla.

## Resumen de patrones

| Patrón                  | Cuándo usarlo                            |
|-------------------------|------------------------------------------|
| `include`               | Relaciones 1:1 o 1:N pequeñas            |
| `select`                | Solo campos específicos                  |
| Cursor pagination       | Infinite scroll / feeds                  |
| Offset pagination       | Paginación con números de página         |
| Índices compuestos      | Filtros con múltiples columnas           |
| `$transaction`          | Operaciones atómicas multi-tabla         |
| `$queryRaw` + parámetros| Queries SQL complejas y seguras          |
