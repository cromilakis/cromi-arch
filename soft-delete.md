# Estrategia de Soft Delete

## 1. Esquema de Prisma

Agregamos los campos `deletedAt` y `deletedBy` a los modelos que lo requieran.

```prisma
model Usuario {
  id        String    @id @default(cuid())
  email     String    @unique
  nombre    String
  // ... otros campos
  deletedAt DateTime?
  deletedBy String?
  creadoEn  DateTime  @default(now())
  actualizadoEn DateTime @updatedAt
}
```

Para modelos relacionados:

```prisma
model Proyecto {
  id        String    @id @default(cuid())
  nombre    String
  usuarioId String
  usuario   Usuario   @relation(fields: [usuarioId], references: [id])
  deletedAt DateTime?
  deletedBy String?
}
```

## 2. Filtrar registros eliminados por defecto

Creamos queries base que excluyen soft-deletes automáticamente:

```tsx
// src/lib/prisma.ts
export const prisma = new PrismaClient().$extends({
  query: {
    $allOperations({ operation, args, query }) {
      // Solo findMany y findFirst: findUnique espera campos únicos en where,
      // agregar deletedAt rompería la query. Usar findFirst cuando necesites
      // buscar por campo único respetando soft delete.
      if (['findMany', 'findFirst'].includes(operation)) {
        args.where = { ...args.where, deletedAt: null };
      }
      return query(args);
    },
  },
});
```

## 3. Función de eliminación

```tsx
async function eliminarUsuario(usuarioId: string, adminId: string) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      deletedAt: new Date(),
      deletedBy: adminId,
    },
  });
}
```

## 4. Restaurar un registro

```tsx
async function restaurarUsuario(usuarioId: string) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      deletedAt: null,
      deletedBy: null,
    },
  });
}
```

## 5. Limpieza de registros antiguos

Script periódico (cron job en Vercel o GitHub Actions):

```tsx
// scripts/limpiar-soft-deletes.ts
const DIAS_RETENCION = 90;

const registrosViejos = await prisma.usuario.findMany({
  where: {
    deletedAt: {
      lte: new Date(Date.now() - DIAS_RETENCION * 24 * 60 * 60 * 1000),
    },
  },
});

// Eliminar físicamente o mover a archivo histórico
for (const reg of registrosViejos) {
  await prisma.usuario.delete({ where: { id: reg.id } });
}
```

## 6. Auditoría de eliminaciones

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  accion      String   // "SOFT_DELETE", "RESTORE", "HARD_DELETE"
  entidad     String   // "Usuario", "Proyecto"
  entidadId   String
  realizadoPor String
  detalles    Json?
  creadoEn    DateTime @default(now())
}
```

## Referencias

- [Migraciones](/migrations.md) — agregar `deletedAt`/`deletedBy` vía migración expand-contract
- [Background Jobs](/background-jobs.md) — el cron de limpieza de registros vencidos
- [Database Patterns](/database-patterns.md) — transacciones e índices para queries con soft delete
```
