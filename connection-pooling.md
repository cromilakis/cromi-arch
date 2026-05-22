# Connection Pooling en Entornos Serverless

## El problema

Prisma abre una conexión a PostgreSQL por instancia de `PrismaClient`. En entornos serverless (Vercel Functions, Edge), cada invocación puede levantar una instancia nueva — bajo carga, esto agota el límite de conexiones de PostgreSQL antes de que la app se sature de requests.

```
PostgreSQL default max_connections = 100
Supabase free tier               = 60
Neon free tier                   = 100

Con 30 functions simultáneas × 1 conexión = OK
Con 70 functions simultáneas × 1 conexión = 💥 "too many connections"
```

El síntoma en producción: la app funciona bien en preview, cae con errores `P1001 / FATAL: remaining connection slots are reserved` en momentos de tráfico alto.

---

## Capa 1 — Singleton en desarrollo local (obligatorio)

Sin esto, Next.js hot reload crea un nuevo `PrismaClient` en cada reload:

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ level: 'query', emit: 'event' }, 'warn', 'error']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Por qué:** en producción serverless cada función tiene su propio proceso — no hay hot reload, así que el singleton no reduce conexiones en prod. Pero en local previene cientos de conexiones abiertas durante desarrollo.

---

## Capa 2 — Parámetros en DATABASE_URL (obligatorio)

Limitar las conexiones que Prisma puede abrir por instancia de función:

```env
# .env.production (Vercel → Environment Variables)
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=1&pool_timeout=20&connect_timeout=10"
```

| Parámetro | Valor | Por qué |
|---|---|---|
| `connection_limit` | `1` | Cada función serverless abre máximo 1 conexión |
| `pool_timeout` | `20` | Segundos de espera si el pool está lleno antes de fallar |
| `connect_timeout` | `10` | Segundos máximos para establecer la conexión inicial |

Con `connection_limit=1`, el límite efectivo es: `max conexiones = número de funciones activas`. Esto es predecible y controlable.

---

## Capa 3 — Connection Pooler externo (producción con tráfico real)

Para apps en producción con tráfico sostenido, necesitas un pooler externo que mantenga un pool de conexiones calientes y distribuya entre las funciones.

### Opción A — Prisma Accelerate (recomendado con Prisma)

Pooler gestionado de Prisma. Reemplaza `DATABASE_URL` con una URL de Accelerate:

```bash
npx prisma generate --no-engine
```

```env
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=ey..."
```

```typescript
// src/lib/db.ts — sin cambios adicionales, el cliente usa Accelerate automáticamente
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

export const prisma = new PrismaClient().$extends(withAccelerate());
```

Accelerate mantiene un pool de conexiones a tu PostgreSQL y expone una interfaz que Prisma usa de forma transparente. Tier gratuito disponible.

### Opción B — PgBouncer (Supabase / self-hosted)

Si usas Supabase, tiene PgBouncer integrado en el puerto 6543:

```env
# Puerto 5432 = direct connection (sin pool)
# Puerto 6543 = PgBouncer (con pool)
DATABASE_URL="postgresql://postgres:[password]@[host]:6543/postgres?pgbouncer=true"
```

El parámetro `pgbouncer=true` le dice a Prisma que deshabilite prepared statements (incompatibles con PgBouncer en transaction mode).

### Opción C — Neon con branching

Neon tiene pooling incorporado por proyecto. Usar la URL del pooler:

```env
# URL directa (sin pool)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb"
# URL con pool
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?pgbouncer=true"
```

---

## Configuración por entorno

| Entorno | Capa 1 | Capa 2 | Capa 3 |
|---|---|---|---|
| **Local dev** | ✅ Singleton | No aplica (servidor persistente) | No necesario |
| **Preview Vercel** | ✅ Singleton | ✅ `connection_limit=1` | Opcional |
| **Producción** | ✅ Singleton | ✅ `connection_limit=1` | ✅ Accelerate / PgBouncer |

---

## Diagnóstico

### Ver conexiones activas en PostgreSQL

```sql
-- Conexiones activas por aplicación
SELECT count(*), application_name, state
FROM pg_stat_activity
GROUP BY application_name, state
ORDER BY count DESC;

-- Conexiones totales vs límite
SELECT
  max_conn,
  used,
  max_conn - used AS available
FROM
  (SELECT count(*) used FROM pg_stat_activity) t1,
  (SELECT setting::int max_conn FROM pg_settings WHERE name = 'max_connections') t2;
```

### Señales de alerta en logs

```
PrismaClientKnownRequestError: P1001 — Can't reach database server
PrismaClientKnownRequestError: P2024 — Timed out fetching a new connection from the pool
FATAL: remaining connection slots are reserved for non-replication superuser
```

Si aparecen estos errores bajo carga, el pooler externo (Capa 3) es obligatorio.

---

## Monitoreo

Agregar a Sentry las métricas de pool en endpoints críticos:

```typescript
// src/lib/db.ts — evento de query lenta
if (process.env.NODE_ENV === 'production') {
  prisma.$on('query', (e) => {
    if (e.duration > 2000) {
      Sentry.addBreadcrumb({
        category: 'db.slow_query',
        message: e.query,
        data: { duration: e.duration },
        level: 'warning',
      });
    }
  });
}
```

---

## Decisión por tamaño de proyecto

| Tráfico esperado | Configuración |
|---|---|
| < 100 usuarios simultáneos | Capas 1 + 2 son suficientes |
| 100–1000 usuarios simultáneos | Capas 1 + 2 + Accelerate/PgBouncer |
| > 1000 usuarios simultáneos | Capas 1 + 2 + pooler dedicado + read replicas |

---

## Referencias

- [Database Patterns](/database-patterns.md) — queries, índices, transacciones con Prisma
- [Estrategia .env](/decisiones/env-strategy.md) — `DATABASE_URL` por entorno
- [Health Check](/health-check.md) — el endpoint `/api/health` valida la conexión a BD
- [Costos](/costos.md) — Prisma Accelerate tiene tier gratuito; Supabase PgBouncer incluido
