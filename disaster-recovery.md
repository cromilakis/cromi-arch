# Disaster Recovery

Procedimientos para recuperar el servicio ante fallos graves. El objetivo es minimizar el tiempo de inactividad y la pérdida de datos con pasos claros que cualquier miembro del equipo pueda seguir bajo presión.

---

## Objetivos de recuperación

| Métrica | Definición | Objetivo |
|---------|-----------|---------|
| **RTO** (Recovery Time Objective) | Tiempo máximo tolerable de inactividad | < 1 hora |
| **RPO** (Recovery Point Objective) | Máxima pérdida de datos aceptable | < 24 horas |

Estos valores son conservadores para un proyecto en fase inicial. Revisarlos cuando el negocio lo exija.

---

## Clasificación de incidentes

| Nivel | Condición | Respuesta |
|-------|-----------|-----------|
| **P0 — Crítico** | App caída completamente, datos inaccesibles, brecha de seguridad activa | Actuar de inmediato, escalar en < 15 min |
| **P1 — Alto** | Feature crítica rota (pagos, auth, datos), degradación > 50% de usuarios | Actuar en < 1 hora |
| **P2 — Medio** | Feature secundaria rota, degradación parcial, lentitud notable | Atender en horario laboral |
| **P3 — Bajo** | Bug cosmético, feature no crítica, impacto mínimo | Planificar en siguiente sprint |

---

## Estrategia de backups

### PostgreSQL

#### Opción A — Supabase (incluido en el plan)

Supabase hace backups automáticos diarios:

| Plan | Retención | Tipo |
|------|-----------|------|
| Free | 7 días | Diario |
| Pro | 30 días | Diario + Point-in-Time Recovery (PITR) hasta 7 días |

Restaurar desde el dashboard: `Supabase → Project → Database → Backups`.

Para acceso programático al último backup:

```bash
# Exportar snapshot manual antes de una operación de riesgo
supabase db dump --project-ref <ref> -f backup-$(date +%Y%m%d-%H%M%S).sql
```

#### Opción B — Neon (incluido en el plan)

Neon guarda el historial completo con branching. Para crear un punto de restore:

```bash
# Crear branch desde un momento específico (Point-in-Time)
neon branches create --name restore-point --project-id <id> \
  --timestamp "2025-05-20T10:00:00Z"
```

#### Opción C — PostgreSQL self-hosted o cualquier proveedor

Backup manual con `pg_dump`:

```bash
# Crear backup comprimido
pg_dump \
  --dbname="$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --file="backup-$(date +%Y%m%d-%H%M%S).dump"

# Verificar integridad del backup (siempre verificar)
pg_restore --list backup-*.dump | head -20
```

Automatizar con cron semanal adicional al del proveedor:

```bash
# .github/workflows/backup.yml
name: DB Backup
on:
  schedule:
    - cron: '0 2 * * 0'  # Domingos a las 02:00 UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Dump database
        run: |
          pg_dump "${{ secrets.DATABASE_URL }}" \
            --format=custom --compress=9 \
            --file=backup-$(date +%Y%m%d).dump

      - name: Upload to storage
        run: |
          # Subir a Supabase Storage o S3
          curl -X POST "${{ secrets.SUPABASE_URL }}/storage/v1/object/backups/db/backup-$(date +%Y%m%d).dump" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            --data-binary @backup-*.dump
```

### Probar el backup (obligatorio una vez al mes)

Un backup que nunca se probó no es un backup — es una esperanza.

```bash
# Restaurar en una DB de test para verificar integridad
createdb test_restore
pg_restore \
  --dbname=test_restore \
  --clean \
  --if-exists \
  backup-latest.dump

# Verificar que las tablas críticas existen y tienen datos
psql test_restore -c "SELECT COUNT(*) FROM users;"
psql test_restore -c "SELECT COUNT(*) FROM orders;"

# Limpiar
dropdb test_restore
```

---

## Runbooks por escenario

### Escenario A — Base de datos inaccesible (P0)

**Síntomas:** `/api/health` retorna 503, errores `P1001` en Sentry, app muestra pantalla de error.

```
1. Verificar estado del proveedor de BD
   → Supabase: status.supabase.com
   → Neon:     neonstatus.com

2. Si es fallo del proveedor: activar modo mantenimiento (ver abajo)
   → Esperar resolución del proveedor
   → ETA típico: 5–30 min para incidentes menores

3. Si es fallo propio (conexiones agotadas, query bloqueante):
   → Ver connection-pooling.md para diagnóstico de conexiones
   → Identificar queries bloqueantes:
      SELECT pid, query, state, wait_event, now() - pg_stat_activity.query_start AS duration
      FROM pg_stat_activity
      WHERE state != 'idle'
      ORDER BY duration DESC;
   → Terminar query bloqueante:
      SELECT pg_terminate_backend(<pid>);

4. Si los datos se corrompieron: restaurar desde backup (ver Escenario C)
```

### Escenario B — Deploy roto (P0/P1)

**Síntomas:** errores 500 generalizados después de un deploy, tasa de error > 10% en Sentry.

```
1. Identificar el deploy problemático en Vercel:
   → Vercel Dashboard → Deployments → ver el último deploy

2. Hacer rollback inmediato en Vercel:
   → Deployments → seleccionar el último deploy estable → "Redeploy"
   → O via CLI: vercel rollback [deployment-url]

3. Tiempo estimado de rollback: 30–60 segundos

4. Verificar que /api/health vuelve a 200

5. Abrir issue urgente con:
   - Commit que causó el problema
   - Error exacto de Sentry (con link)
   - Steps para reproducir en local
```

### Escenario C — Restauración de base de datos (P0)

**Cuándo usar:** corrupción de datos, migración fallida sin reversión, borrado accidental masivo.

```bash
# PASO 1: Activar modo mantenimiento ANTES de restaurar
# (evita escrituras durante la restauración)
# → Agregar variable de entorno en Vercel: MAINTENANCE_MODE=true
# → El middleware redirige todo a /maintenance

# PASO 2: Identificar el backup más reciente previo al incidente
# En Supabase: Dashboard → Database → Backups → seleccionar punto de restauración
# En local con pg_dump:
ls -lt backups/ | head -5   # listar los más recientes

# PASO 3: Restaurar
pg_restore \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --single-transaction \
  backup-YYYYMMDD.dump

# PASO 4: Re-aplicar migraciones post-backup si el backup es de hace días
npx prisma migrate deploy

# PASO 5: Verificar integridad
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$DATABASE_URL" -c "SELECT MAX(created_at) FROM orders;"

# PASO 6: Desactivar modo mantenimiento
# → Eliminar MAINTENANCE_MODE de Vercel → Redeploy

# PASO 7: Documentar pérdida de datos
# → Identificar registros creados entre el backup y el incidente
# → Notificar a usuarios afectados si corresponde (ver privacy.md)
```

### Escenario D — Migración fallida en producción (P0/P1)

```bash
# Si la migración está a medias y la BD tiene estado inconsistente:

# 1. Verificar estado de migraciones
npx prisma migrate status

# 2. Si hay migración marcada como "failed":
#    NO ejecutar migrate deploy de nuevo — puede empeorar el estado

# 3. Opción A (preferida): crear migración de reversión
#    → Escribir SQL que deshaga el cambio
#    → Crear archivo en prisma/migrations/ manualmente
#    → Marcar como aplicada: npx prisma migrate resolve --applied <nombre>

# 4. Opción B (emergencia): restaurar desde backup (Escenario C)
#    → Usar si el Opción A no es posible por corrupción de datos
```

### Escenario E — Redis / Upstash inaccesible (P1/P2)

**Impacto:** rate limiting desactivado, caché de sesión caído, feature flags no disponibles.

```
1. Verificar estado: upstash.com/status

2. La app debe degradar gracefully:
   → Si rate limiter falla → permitir requests (fail open) para no bloquear usuarios
   → Si caché falla → ir directo a BD (más lento pero funcional)
   → Si session store falla → re-login requerido (notificar al usuario)

3. Verificar que el código de rate limiting tiene fallback:
```

```typescript
// lib/rate-limit.ts — siempre tener fallback
export async function rateLimitCheck(ip: string, limiter: Ratelimit) {
  try {
    const { success, limit, remaining } = await limiter.limit(ip);
    if (!success) return Response.json({ error: 'Too many requests' }, { status: 429 });
  } catch {
    // Redis caído → fail open (no bloquear al usuario)
    // Loggear para investigar, pero no romper el flujo
    logger.warn('Rate limiter unavailable, failing open');
  }
  return null;
}
```

### Escenario F — Brecha de seguridad activa (P0)

```
1. CONTENER primero, investigar después:
   → Revocar todos los tokens: rotar AUTH_SECRET en Vercel → Redeploy
      (invalida todas las sesiones activas de todos los usuarios)
   → Si hay API key comprometida: rotarla en el proveedor + actualizar en Vercel

2. Preservar evidencia:
   → NO eliminar logs ni audit logs
   → Tomar screenshot de Sentry/logs antes de cualquier acción

3. Evaluar alcance:
   → ¿Qué datos fueron accedidos? (audit logs)
   → ¿Cuántos usuarios afectados?
   → ¿Hay PII expuesta?

4. Notificaciones legales:
   → PII de usuarios europeos expuesta: notificar autoridad en < 72 h (GDPR Art. 33)
   → Ver privacy.md → sección "Notificación de brecha"

5. Comunicar a usuarios si hay "alto riesgo" para ellos
```

---

## Modo mantenimiento

Middleware que redirige toda la app a una página estática cuando `MAINTENANCE_MODE=true`:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const isMaintenancePage = request.nextUrl.pathname === '/maintenance';
  const isHealthEndpoint = request.nextUrl.pathname === '/api/health';

  // Siempre permitir el health check (para monitoreo externo)
  if (isHealthEndpoint) return NextResponse.next();

  if (isMaintenanceMode && !isMaintenancePage) {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

  return NextResponse.next();
}
```

```
Variable a configurar en Vercel (sin redeploy, cambia en tiempo real):
MAINTENANCE_MODE=true  → activa mantenimiento
MAINTENANCE_MODE=      → desactiva mantenimiento
```

---

## Post-mortem

Completar dentro de las **48 horas** siguientes a un incidente P0 o P1.

```markdown
# Post-mortem: [Título del incidente]

**Fecha:** YYYY-MM-DD
**Duración:** HH:MM – HH:MM (X minutos de impacto)
**Nivel:** P0 / P1
**Redactado por:** [nombre]

## Resumen
[2-3 líneas: qué pasó, cuánto duró, cuántos usuarios afectados]

## Línea de tiempo
- HH:MM — Primera alerta detectada (Sentry / usuario / monitoreo)
- HH:MM — Diagnóstico identificado
- HH:MM — Acción de mitigación aplicada
- HH:MM — Servicio restaurado
- HH:MM — Verificación completa

## Causa raíz
[La causa técnica real, no el síntoma]

## Qué salió bien
[Detección rápida, rollback funcionó, monitoreo alertó, etc.]

## Qué falló
[Qué no funcionó como se esperaba]

## Acciones correctivas
| Acción | Responsable | Fecha límite |
|--------|-------------|--------------|
| [acción concreta] | [nombre] | YYYY-MM-DD |

## Impacto en usuarios
- Usuarios afectados: [número estimado]
- Pérdida de datos: [ninguna / descripción]
- Comunicación enviada: [sí/no, cuándo]
```

---

## Verificación mensual

Tareas que deben ocurrir el primer lunes de cada mes:

```
[ ] Probar restore de backup en BD de test (Escenario C, pasos 2-5)
[ ] Verificar que las alertas de Sentry siguen activas
[ ] Confirmar que /api/health responde correctamente en producción
[ ] Revisar logs de backups automáticos del proveedor
[ ] Verificar que MAINTENANCE_MODE funciona (activar y desactivar en staging)
```

---

## Referencias

- [Health Check](/health-check.md) — primer indicador de fallos, base del monitoreo externo
- [Sentry](/sentry.md) — alertas que disparan la respuesta a incidentes
- [Migrations](/migrations.md) — estrategia expand-contract y rollback de migraciones
- [Connection Pooling](/connection-pooling.md) — diagnóstico de fallos de BD por conexiones agotadas
- [Privacy](/privacy.md) — obligaciones legales en caso de brecha de seguridad (GDPR Art. 33)
- [Fase 8 — Monitoreo](/fases/fase-8-monitoreo.md) — configuración de alertas que detectan los incidentes
