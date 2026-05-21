# Trabajos en Segundo Plano (Background Jobs)

## Vercel Cron Jobs

Vercel permite hasta **5 cron jobs** por proyecto, con **ejecución máxima de 10 segundos**.

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/crons/cleanup-logs",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/crons/send-daily-report",
      "schedule": "0 8 * * *"
    }
  ]
}
```

```typescript
// app/api/crons/cleanup-logs/route.ts
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  // Verificar que Vercel Cron ejecuta esta llamada
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } },
  });

  return Response.json({ data: { deleted: true } });
}
```

## Cuándo Usar Cada Opción

| Necesidad | Solución | Límite |
|-----------|----------|--------|
| Tarea simple, <10s, 1x/día | Vercel Cron | 5 jobs, 10s |
| Tarea larga (>10s) | **Inngest** / **Upstash QStash** | Ilimitado |
| Múltiples pasos (encadenados) | **Inngest** (workflows) | Ilimitado |
| Necesita retry con backoff | **Upstash QStash** | Configurable |
| Procesar cola de emails | **Inngest** / **BullMQ** | Ilimitado |

## Patrones para Jobs Confiables

### Idempotencia

```typescript
export async function sendWelcomeEmail(userId: string) {
  const jobId = `welcome-email:${userId}`;

  const processed = await redis.get(jobId);
  if (processed) return; // Ya enviado

  await resend.emails.send({
    from: 'onboarding@midominio.com',
    to: user.email,
    subject: '¡Bienvenido!',
  });

  await redis.set(jobId, 'done', { ex: 86400 });
}
```

### Retry con Backoff Exponencial

```typescript
async function processWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Monitoreo de Jobs Fallidos

```typescript
// lib/job-monitor.ts
import { pino } from 'pino';
import * as Sentry from '@sentry/nextjs';

const logger = pino({ name: 'background-jobs' });

export async function trackJob(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    logger.info({ job: name, duration: Date.now() - start }, 'Job completed');
  } catch (error) {
    logger.error({ job: name, error }, 'Job failed');
    Sentry.captureException(error, { tags: { job: name } });
    throw error;
  }
}
```

## Ejemplos Prácticos

| Job | Estrategia | Frecuencia |
|-----|-----------|------------|
| Enviar emails de bienvenida | Inngest (trigger en registro) | Tiempo real |
| Limpiar archivos temporales | Vercel Cron | Diario (03:00) |
| Generar reporte mensual | Inngest (schedule) | Mensual |
| Sincronizar datos con Stripe | Upstash QStash | Cada hora |
| Enviar notificaciones push | Inngest (batch) | Cada 5 min |

## Variables de entorno

```
CRON_SECRET=generate-with-openssl-rand-base64-32
```

Agregar a `.env.example`. Ver [Estrategia .env](/decisiones/env-strategy.md) para convenciones de nomenclatura.

## Referencias

- [Sentry](/sentry.md) — monitoreo de jobs fallidos con alertas
- [Soft Delete](/soft-delete.md) — el cron de limpieza de registros borrados lógicamente
- [Rate Limiting](/decisiones/rate-limiting.md) — los endpoints de cron también deben estar protegidos
- [Estrategia .env](/decisiones/env-strategy.md) — `CRON_SECRET` y otras variables de jobs
