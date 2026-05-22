# Endpoint de Health Check

## 1. Ruta de health check

`GET /api/health` — verifica el estado de todos los servicios críticos.

```tsx
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    servicios: {
      baseDeDatos: await checkDB(),
      sentry: await checkSentry(),
      storage: await checkStorage(),
      redis: await checkRedis(),
    },
    memoria: {
      usado: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      porcentaje: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
    },
    entorno: process.env.VERCEL_ENV || 'development',
  };

  const estadoGeneral = Object.values(checks.servicios).every(s => s === 'ok')
    ? 'ok' : 'degradado';

  return Response.json(
    { ...checks, status: estadoGeneral },
    { status: estadoGeneral === 'ok' ? 200 : 503 }
  );
}
```

## 2. Respuesta de ejemplo

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "uptime": 1234567.89,
  "servicios": {
    "baseDeDatos": "ok",
    "sentry": "ok",
    "storage": "ok",
    "redis": "ok"
  },
  "memoria": {
    "usado": 52428800,
    "total": 104857600,
    "porcentaje": 50
  },
  "entorno": "production"
}
```

## 3. Funciones helper de verificación

```tsx
async function checkDB() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkStorage() {
  try {
    const { data } = await supabase.storage.listBuckets();
    return data ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

async function checkRedis() {
  try {
    const redis = Redis.fromEnv();
    await redis.ping();
    return 'ok';
  } catch {
    return 'error';
  }
}
```

## 4. Integración con Vercel

En Vercel, configurar el endpoint como ruta de monitoreo:

```
Project Settings → Monitoring → Health Endpoint
URL: https://tudominio.com/api/health
```

## 5. Monitoreo externo

| Servicio | Configuración |
|----------|--------------|
| **Checkly** | `GET /api/health` cada 1 minuto |
| **Better Uptime** | `GET /api/health` cada 5 minutos |
| **UptimeRobot** | `GET /api/health` cada 5 minutos |

Configurar alertas en Slack/Email cuando el status sea `degradado` por más de 2 chequeos consecutivos.

## Referencias

- [Sentry](/sentry.md) — monitoreo complementario de errores en tiempo real
- [Fase 8 — Monitoreo](/fases/fase-8-monitoreo.md) — contexto del plan de monitoreo general
- [Background Jobs](/background-jobs.md) — los crons también deberían tener su propio endpoint de health o logs de éxito/fallo
