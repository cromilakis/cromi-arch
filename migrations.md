# Migraciones de Base de Datos

Estrategia de migraciones con Prisma orientada a zero-downtime en producción.

## Estrategia: Expand-Contract

Toda migración que rompe compatibilidad sigue tres fases desplegadas en PRs separados:

```
EXPAND   →   MIGRATE   →   CONTRACT
(nuevo)       (datos)      (limpieza)
```

| Fase | Qué hace | Deploy |
|---|---|---|
| **EXPAND** | Agrega nueva columna/tabla (nullable). El código viejo sigue funcionando. | Auto — bajo riesgo |
| **MIGRATE** | Backfill de datos existentes. Código actualizado escribe en ambos lugares. | Auto — sin downtime |
| **CONTRACT** | Elimina columna/tabla vieja. Solo cuando el código ya no la usa. | Revisión manual |

**Por qué:** en producción, el deploy de código y el deploy de BD no son atómicos. Si la migración y el código no son compatibles en ambas direcciones, hay un momento de downtime.

Ejemplo: renombrar `name` a `fullName`:
1. EXPAND: añadir `fullName nullable`
2. MIGRATE: backfill + código escribe en ambos
3. CONTRACT: eliminar `name` después de verificar en producción

## Environments

| Entorno | Migración | Quién la ejecuta |
|---|---|---|
| Local | `prisma migrate dev` | Developer — genera archivo de migración |
| Preview (Vercel) | `prisma migrate deploy` | CI automático — seguro porque es BD aislada |
| Producción | `prisma migrate deploy` | **Humano o pipeline con aprobación manual** |

**Nunca** ejecutar `prisma migrate deploy` en producción de forma automática sin revisión. El agente prepara el comando, pero el humano verifica y aprueba antes de que corra.

## Flujo en CI/CD

```yaml
# .github/workflows/deploy.yml (fragmento)
jobs:
  migrate:
    steps:
      - run: npx prisma generate    # genera el cliente
      - run: npx prisma migrate deploy  # aplica pendientes (preview only)
      - run: npm run build
```

Para producción, el job de migración requiere `environment: production` con aprobación en GitHub:

```yaml
jobs:
  migrate-prod:
    environment: production   # requiere aprobación manual en GitHub
    steps:
      - run: npx prisma migrate deploy
```

## Antes de cada deploy

```bash
# Previsualizar los cambios SQL sin aplicar
npx prisma migrate diff \
  --from-schema-datasource ./prisma/schema.prisma \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script

# Verificar estado de migraciones
npx prisma migrate status
```

Revisar siempre la salida de `migrate diff` antes de aprobar una migración en producción.

## Rollback

Prisma no tiene `rollback` nativo. La estrategia es:

1. **Preferred:** crear nueva migración que deshace el cambio (compatible con expand-contract)
2. **Emergencia:** restaurar backup de PostgreSQL y re-aplicar migraciones hasta el punto anterior

```bash
# Restaurar base de datos desde backup
pg_restore -d $DATABASE_URL backup.dump
npx prisma migrate deploy
```

**Regla:** nunca eliminar archivos de migración del directorio `prisma/migrations/`. Son el historial de la BD.

## Squash de migraciones

Para limpiar un historial muy largo (uso en proyectos maduros, no en producción activa):

```bash
# 1. Crear una migración baseline desde el schema actual
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > ./prisma/migrations/0_baseline/migration.sql

# 2. Marcar como aplicada (la BD ya tiene ese estado)
npx prisma migrate resolve --applied 0_baseline

# 3. Eliminar archivos de migración anteriores
```

> Solo en equipos pequeños con coordinación. Cada developer debe hacer `prisma migrate reset` localmente después.

## Comandos de referencia

| Comando | Cuándo usarlo |
|---|---|
| `prisma migrate dev` | Desarrollo local — genera y aplica |
| `prisma migrate deploy` | CI/CD — aplica pendientes sin generar |
| `prisma migrate status` | Ver qué migraciones están pendientes |
| `prisma migrate diff` | Previsualizar SQL sin aplicar |
| `prisma migrate reset` | Reset local (⚠️ destruye datos) — nunca en producción |

## Referencias

- [Fase 9 — CI/CD](/fases/fase-9-cicd.md) — pipeline completo donde corren las migraciones
- [Data Seeding](/data-seeding.md) — seeds que corren después de las migraciones
- [Database Patterns](/database-patterns.md) — patrones de índices y queries
- [Estrategia .env](/decisiones/env-strategy.md) — `DATABASE_URL` por entorno
