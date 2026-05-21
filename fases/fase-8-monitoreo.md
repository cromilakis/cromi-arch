# Fase 8: Monitoreo de Producción

**Propósito:** Configurar la observabilidad de **producción** — Sentry DSN, alertas, dashboards y runbook de incidentes. El logging estructurado (Pino) y el health endpoint fueron scaffoldeados en Fase 5 y verificados en Fase 7; aquí se conectan con los sistemas externos y se definen los procedimientos operativos.

## Qué ya existe (desde Fase 5)

| Componente | Estado |
|---|---|
| `/api/health` | Implementado y testeado en Fase 7 |
| Pino (logging JSON) | Configurado y funcionando |
| `pg_stat_statements` | Habilitado en DB |

## Qué se configura en esta fase

| Componente | Propósito |
|---|---|
| Sentry DSN + Source Maps | Error tracking en producción con stack traces reales |
| Sentry Performance | Traces de transacciones y detección de N+1 |
| Alertas de error rate | Error rate > 1% en 5 min → notificación |
| Alertas de latencia | p95 > 2s → investigación |
| Alerta de health check | 3 fallos consecutivos → escalar |
| Dashboard de producción | Vista unificada: errors, latency, uptime |

## Configuración de Sentry

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [Sentry.prismaIntegration()],
})
```

## Alertas

```
Error rate > 1% (últimos 5 min)  → Slack #alerts + email on-call
Latencia p95 > 2s                → Slack #alerts
Health check falla × 3           → PagerDuty / escalación
Query lenta detectada (> 500ms)  → Slack #db-alerts
```

## Runbook de Incidentes

Documentar en `docs/runbook.md`:
1. Cómo identificar el error en Sentry
2. Cómo correlacionar con logs de Pino
3. Cómo forzar un rollback de deployment en Vercel
4. Cómo ejecutar una migration de emergencia
5. Escalación: quién contactar y cuándo

## Artefactos

| Archivo | Descripción |
|---|---|
| `docs/monitoring-plan.md` | Componentes, umbrales y procedimientos |
| `docs/runbook.md` | Procedimientos operativos: deploy, debug, rollback |
| `sentry.server.config.ts` | Configuración de Sentry para producción |
| `sentry.client.config.ts` | Configuración de Sentry en cliente |

## Gate Humano

> "Sentry conectado, alertas configuradas, runbook en docs/runbook.md. ¿Apruebas?"

✅ El humano aprueba antes de pasar a Fase 9.
