# Fase 8: Monitoreo

**Propósito:** Configurar observabilidad desde el día 1 para detectar problemas en producción antes de que los usuarios los reporten.

## Componentes

| Componente | Propósito |
|---|---|
| Sentry | Error tracking + performance traces |
| Pino | Logging estructurado (JSON) |
| `/api/health` | Health check endpoint |
| Alertas | Error rate > 1%, latency p95 > 2s |
| pg_stat_statements | Detección de consultas lentas |

## Health Check Endpoint

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const dbOk = await checkDatabaseConnection()
  return Response.json({
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
```

## Alertas

- Error rate > 1% en los últimos 5 minutos → notificación
- Latencia p95 > 2s → investigación
- Health check falla 3 veces consecutivas → escalar

## Artefactos

| Archivo | Descripción |
|---|---|
| `docs/monitoring-plan.md` | Plan de monitoreo con alertas y procedimientos |

## Gate Humano

> "Monitoreo configurado. ¿Apruebas?"

✅ El humano aprueba antes de pasar a Fase 9.
