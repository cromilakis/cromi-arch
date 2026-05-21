# Monitoring Plan — Next.js + PostgreSQL

## 1. Error Tracking (Sentry)

### Configuración
- DSN de Sentry en `.env`: `SENTRY_DSN=...`
- `@sentry/nextjs` instalado
- Source maps upload en CI para stack traces legibles
- Performance tracing habilitado (muestras del 10%)

### Alertas
- [ ] Error rate > 1% en últimos 5 min → notificar Slack/email
- [ ] Nuevos errores no categorizados → notificar
- [ ] Latencia p95 > 2s en API routes → notificar

## 2. Logging Estructurado (Pino)

### Configuración

Logger centralizado en `src/lib/logger.ts`. Ver [Logging](/logging.md) para la implementación completa con `redact`, `pino-pretty` en dev y `formatters`.

### Niveles
- `fatal` — caída del sistema
- `error` — error manejado, necesita atención
- `warn` — condición anómala no crítica
- `info` — eventos de negocio (registro, login, pago)
- `debug` — solo en desarrollo

### Eventos a loggear siempre
- [ ] Login exitoso y fallido
- [ ] Registro de usuarios
- [ ] Cambios de contraseña
- [ ] Errores 4xx y 5xx
- [ ] Operaciones CRUD en datos sensibles
- [ ] Rate limiting activado

## 3. Health Checks

### Endpoint: `GET /api/health`

Ver [Health Check](/health-check.md) para la implementación completa con `checkDatabase()`, `checkRedis()`, uptime y memoria.

### Qué verificar
- [ ] Conexión a PostgreSQL (SELECT 1)
- [ ] Conexión a Redis (PING)
- [ ] Disk space > 20% free
- [ ] Connection pool usage < 80%

## 4. Database Monitoring

### PostgreSQL
- [ ] `pg_stat_statements` extension activada
- [ ] Slow query log: queries > 500ms
- [ ] Connection pool size monitoreado
- [ ] Table bloat monitoreado
- [ ] Index usage statistics

### Prisma
- [ ] Query logging en desarrollo
- [ ] Query timing en producción
- [ ] N+1 detection (Prisma Preview feature)

## 5. Métricas de Negocio

### Dashboard (Grafana, Datadog, o similar)
- [ ] Usuarios registrados (por día/semana/mes)
- [ ] Usuarios activos (DAU/MAU)
- [ ] Tasa de conversión (registro → primera acción)
- [ ] Errores por endpoint
- [ ] Latencia por endpoint (p50, p95, p99)
- [ ] Throughput (requests/minuto)

## 6. Infraestructura

### VPS / Docker
- [ ] CPU usage > 80% → alerta
- [ ] RAM usage > 80% → alerta
- [ ] Disk usage > 80% → alerta
- [ ] SSL cert expira en < 30 días → alerta

### Vercel
- [ ] Function duration > 10s → alerta
- [ ] Edge function errors > 1% → alerta
- [ ] Bandwidth usage > 80% del plan → alerta

## 7. Uptime Monitoring

### Herramienta (Checkly, Better Uptime, Pingdom)
- [ ] Check cada 5 min a `/api/health`
- [ ] Check a página principal
- [ ] Check a flujo crítico (login)
- [ ] Notificación Slack/email en downtime

## 8. Log Retention

| Tipo | Retención | Destino |
|------|-----------|---------|
| Aplicación (Pino) | 30 días | Log file / stdout |
| Errores (Sentry) | 90 días | Sentry dashboard |
| Acceso (Nginx) | 30 días | Log file |
| Base de datos | 7 días | pg_stat_statements |
| Auditoría | 1 año | Archivo separado |

## Referencias

- [Sentry](/sentry.md) — configuración, source maps, alertas y Error Boundaries
- [Logging](/logging.md) — logger centralizado Pino con redact, levels y pino-pretty
- [Health Check](/health-check.md) — implementación completa de `GET /api/health`
- [Analítica](/analytics.md) — métricas de negocio (DAU/MAU, conversión, funnels)
- [Performance Budget](/performance-budget.md) — targets de LCP, CLS y latencia p95
