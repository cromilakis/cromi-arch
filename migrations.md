# Estrategia de Migraciones de Base de Datos

## Flujo de Migraciones en CI/CD

Todas las migraciones se ejecutan automáticamente en el pipeline de GitHub Actions antes del despliegue a producción.

```yaml
# .github/workflows/deploy.yml (fragmento)
jobs:
  migrate:
    steps:
      - run: npx prisma migrate deploy
```

Usar `prisma migrate deploy` en CI (no `prisma migrate dev`) — ejecuta solo migraciones pendientes de forma segura.

**Orden en el pipeline:**
1. `prisma generate` — genera el cliente Prisma
2. `prisma migrate deploy` — aplica migraciones pendientes
3. Build de la app
4. Despliegue a Vercel

> **Nota:** No es necesario ejecutar `prisma migrate generate` explícitamente si usas `prisma generate` después de migrar. En versiones recientes de Prisma (>5.0), `prisma migrate deploy` ya regenera el cliente automáticamente.

## Rollbacks

Prisma no tiene un comando `rollback` nativo. Estrategia recomendada:

1. **Nunca eliminar archivos de migración** del directorio `prisma/migrations/`.
2. Para revertir: crear una nueva migración que deshaga los cambios.
3. Si es urgente, restaurar desde el backup de PostgreSQL y re-aplicar migraciones.

```bash
# Restaurar base de datos desde backup
pg_restore -d <DATABASE_URL> backup.dump
npx prisma migrate deploy
```

## Seed Data

Usar `prisma/seed.ts` con datos de prueba:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin',
    },
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

Ejecutar: `npx prisma db seed`

## Seguridad Antes del Despliegue

- `prisma migrate diff` para previsualizar cambios SQL sin aplicarlos.
- Revisar `prisma migrate status` antes de cada deploy.
- **Nunca** ejecutar `prisma migrate reset` en producción.

## Squash de Migraciones

Cuando el historial crece demasiado, Prisma ya no ofrece el comando `migrate squash`. El método oficial actual usa `migrate diff` + `migrate resolve`:

```bash
# 1. Crear una migración baseline desde el schema actual
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > ./prisma/migrations/0_squashed/migration.sql

# 2. Marcar la migración como aplicada (en producción ya existe)
npx prisma migrate resolve --applied 0_squashed

# 3. Eliminar archivos de migración antiguos (excepto la nueva baseline)
```

**⚠️ Precaución:** Solo hacer squash en equipos pequeños. Requiere coordinación para que todos los desarrolladores reseteen su base de datos local. Después del squash, cada developer debe ejecutar `prisma migrate reset` localmente.
