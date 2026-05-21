# Rotación de Secretos

Procedimientos para rotar credenciales sin interrumpir el servicio. Hay dos modos: **rotación programada** (preventiva, planificada) y **rotación de emergencia** (secreto comprometido, actuar inmediato).

---

## Inventario de secretos

| Secreto | Variable | Impacto de rotar | Frecuencia recomendada |
|---------|----------|-----------------|----------------------|
| Auth secret (firma JWT) | `AUTH_SECRET` | Cierra todas las sesiones activas | Cada 90 días o ante sospecha |
| Contraseña de BD | `DATABASE_URL` | Desconexión temporal si no se hace bien | Cada 180 días |
| Stripe secret key | `STRIPE_SECRET_KEY` | Ninguno si se rota bien | Ante sospecha / offboarding |
| Stripe webhook secret | `STRIPE_WEBHOOK_SECRET` | Webhooks rechazados hasta el redeploy | Ante sospecha |
| Resend API key | `RESEND_API_KEY` | Emails fallidos hasta el redeploy | Ante sospecha / offboarding |
| Supabase service role | `SUPABASE_SERVICE_ROLE_KEY` | Acceso a storage/BD roto hasta redeploy | Ante sospecha / offboarding |
| Upstash Redis token | `UPSTASH_REDIS_REST_TOKEN` | Rate limiting y caché caídos hasta redeploy | Ante sospecha |
| GitHub OAuth secret | `AUTH_GITHUB_SECRET` | Login con GitHub roto hasta redeploy | Ante sospecha / offboarding |
| Sentry auth token | `SENTRY_AUTH_TOKEN` | Source maps no se suben en CI | Ante sospecha |
| Cron secret | `CRON_SECRET` | Crons no autorizados hasta redeploy | Ante sospecha |

---

## Principio general: crear antes de revocar

Para rotación sin downtime la secuencia es siempre:

```
1. Crear nuevo secreto en el proveedor (el viejo sigue activo)
2. Actualizar en Vercel → redeploy
3. Verificar que el nuevo secreto funciona (health check, smoke test)
4. Revocar el secreto viejo en el proveedor
```

Nunca revocar el secreto viejo antes de que el redeploy esté verificado.

---

## Runbooks por secreto

### AUTH_SECRET

El más delicado. Auth.js usa este valor para firmar y verificar todos los JWTs. Rotarlo invalida todas las sesiones activas — los usuarios serán desconectados.

**Cuándo es aceptable:** anunciar con anticipación o rotar en horario de baja actividad.

**Si se necesita transición gradual:** usar Database Sessions en lugar de JWT. Con sessions en BD, `AUTH_SECRET` solo protege las cookies de sesión, no los tokens en sí — el impacto es menor.

```bash
# Paso 1: generar nuevo secreto
NEW_SECRET=$(openssl rand -base64 32)
echo $NEW_SECRET   # guardar este valor

# Paso 2: actualizar en Vercel (sin redeploy todavía)
vercel env rm AUTH_SECRET production
vercel env add AUTH_SECRET production
# → pegar el nuevo valor cuando lo pida

# Paso 3: redeploy para que tome efecto
vercel --prod

# Paso 4: verificar que el login funciona
curl https://tuapp.com/api/health

# Paso 5: comunicar a usuarios si es necesario
# "Tu sesión ha expirado por mantenimiento de seguridad. Por favor vuelve a iniciar sesión."
```

> No hay secreto viejo que revocar en el proveedor — el secreto anterior simplemente deja de estar configurado.

---

### DATABASE_URL (contraseña de PostgreSQL)

Rotación sin downtime si se hace con el orden correcto.

```bash
# Paso 1: crear nuevo usuario de BD con los mismos permisos
psql $DATABASE_URL -c "
  CREATE USER appuser_new WITH PASSWORD 'nueva-contraseña-segura';
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO appuser_new;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO appuser_new;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO appuser_new;
"

# Paso 2: construir la nueva DATABASE_URL
# postgresql://appuser_new:nueva-contraseña-segura@host:5432/db

# Paso 3: actualizar en Vercel
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
# → pegar la nueva URL

# Paso 4: redeploy
vercel --prod

# Paso 5: verificar health check
curl https://tuapp.com/api/health

# Paso 6: revocar el usuario viejo
psql $DATABASE_URL_NEW -c "
  REASSIGN OWNED BY appuser_old TO appuser_new;
  DROP OWNED BY appuser_old;
  DROP USER appuser_old;
"
```

Con **Supabase**: Dashboard → Settings → Database → Reset database password. Supabase genera la nueva contraseña — copiar y actualizar en Vercel.

Con **Neon**: Dashboard → Settings → Connection string → Reset password.

---

### Stripe secret key

Stripe permite tener múltiples claves activas simultáneamente, lo que hace la rotación completamente transparente.

```bash
# Paso 1: crear nueva clave en Stripe Dashboard
# Stripe → Developers → API keys → Create secret key

# Paso 2: actualizar en Vercel
vercel env rm STRIPE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY production
# → pegar sk_live_nueva...

# Paso 3: redeploy
vercel --prod

# Paso 4: verificar (hacer una llamada de prueba)
curl https://tuapp.com/api/health

# Paso 5: revocar la clave vieja en Stripe Dashboard
# Stripe → Developers → API keys → Roll key (o Delete)
```

---

### Stripe webhook secret

El webhook secret es diferente por endpoint registrado. Stripe lo genera al crear el endpoint.

```bash
# Paso 1: en Stripe Dashboard → Developers → Webhooks
# Seleccionar el endpoint → "Roll secret"
# Stripe genera un nuevo whsec_... y mantiene el viejo activo 24 horas

# Paso 2: actualizar en Vercel
vercel env rm STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_WEBHOOK_SECRET production
# → pegar el nuevo whsec_...

# Paso 3: redeploy
vercel --prod

# Paso 4: verificar con un evento de prueba desde Stripe Dashboard
# → Send test webhook → verificar que llega con 200

# Paso 5: el secreto viejo expira automáticamente en 24 horas
```

---

### Resend API key

```bash
# Paso 1: crear nueva clave en Resend Dashboard → API Keys → Create API Key

# Paso 2: actualizar en Vercel
vercel env rm RESEND_API_KEY production
vercel env add RESEND_API_KEY production

# Paso 3: redeploy y verificar

# Paso 4: revocar la clave vieja en Resend Dashboard → API Keys → Delete
```

---

### Upstash Redis token

```bash
# Paso 1: Upstash Dashboard → Database → Details → Reset Token

# Paso 2: actualizar UPSTASH_REDIS_REST_TOKEN y UPSTASH_REDIS_REST_URL en Vercel
# (Upstash puede cambiar ambos al resetear)

# Paso 3: redeploy y verificar health check (redis: "ok")

# El token viejo queda revocado inmediatamente al resetear —
# hacer el redeploy lo más rápido posible para minimizar ventana de error
```

> Upstash no soporta múltiples tokens activos simultáneamente. Hay una ventana breve de degradación entre el reset y el redeploy. Minimizarla con `vercel --prod` inmediatamente después del reset.

---

## Rotación de emergencia (secreto comprometido)

Cuando hay evidencia o sospecha de que un secreto fue expuesto (leak en git, log, screenshot, etc.).

**Prioridad: velocidad sobre elegancia. Aceptar downtime breve si es necesario.**

```
1. Identificar qué secreto fue expuesto y cómo
2. Revocar el secreto viejo INMEDIATAMENTE en el proveedor (no esperar al redeploy)
3. Generar y configurar el nuevo secreto en Vercel
4. Redeploy
5. Si es AUTH_SECRET: comunicar a los usuarios que sus sesiones fueron cerradas por seguridad
6. Revisar audit logs para detectar uso no autorizado del secreto comprometido
7. Si hay acceso no autorizado a datos: seguir el runbook de brecha (disaster-recovery.md)
8. Documentar en post-mortem cómo ocurrió el leak
```

---

## Detección de secretos en git

### Antes de que lleguen al repo

`git-secrets` o `gitleaks` como hook pre-commit adicional a Semgrep:

```bash
# Instalar gitleaks
brew install gitleaks

# Agregar a .husky/pre-commit
gitleaks protect --staged --redact
```

### Escanear el historial existente

```bash
# Escanear todo el historial del repo
gitleaks detect --source . --report-path gitleaks-report.json

# Ver el reporte
cat gitleaks-report.json | jq '.[].Description'
```

### GitHub Secret Scanning (automático)

Habilitar en: `Repo Settings → Security → Secret scanning → Enable`.

GitHub escanea cada push y alerta automáticamente si detecta patrones de secretos conocidos (Stripe keys, AWS keys, etc.). También notifica al proveedor (Stripe, AWS) para que revoquen el token inmediatamente.

### Si un secreto ya está en el historial de git

```bash
# IMPORTANTE: notificar a todos los colaboradores antes de hacer esto
# El historial reescrito requiere force push y sincronización manual de todos

# Usando git-filter-repo (más seguro que BFG)
pip install git-filter-repo

git filter-repo --replace-text <(echo "sk_live_SECRETO_REAL==>REMOVED")

# Revocar el secreto expuesto INMEDIATAMENTE (antes de cualquier otra acción)
# El historial limpio no ayuda si el secreto sigue activo
```

> Limpiar el historial de git no es suficiente — cualquiera que haya clonado el repo antes del cleanup puede tener el secreto. **Rotar siempre, además de limpiar.**

---

## Auditoría de secretos activos

Revisar trimestralmente:

```bash
# Listar variables configuradas en Vercel (sin mostrar valores)
vercel env ls production

# Verificar que no hay secretos en variables NEXT_PUBLIC_ (nunca deberían estar)
vercel env ls production | grep NEXT_PUBLIC
```

Checklist trimestral:

```
[ ] Revocar API keys de ex-colaboradores en todos los proveedores
[ ] Verificar que solo los entornos activos tienen secretos configurados
[ ] Revisar GitHub Actions secrets: Settings → Secrets → Actions
[ ] Ejecutar gitleaks detect en el historial completo
[ ] Verificar que GitHub Secret Scanning está habilitado
[ ] Rotar AUTH_SECRET si han pasado > 90 días
```

---

## Variables de entorno: a qué proveedores ir por cada una

| Variable | Proveedor | URL de gestión |
|----------|-----------|----------------|
| `AUTH_SECRET` | Generar localmente | `openssl rand -base64 32` |
| `DATABASE_URL` | Supabase / Neon | Dashboard → Settings → Database |
| `STRIPE_SECRET_KEY` | Stripe | Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Dashboard → Developers → Webhooks |
| `RESEND_API_KEY` | Resend | Dashboard → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Dashboard → Settings → API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Dashboard → Database → Details |
| `AUTH_GITHUB_SECRET` | GitHub | Settings → Developer settings → OAuth Apps |
| `SENTRY_AUTH_TOKEN` | Sentry | Settings → Auth Tokens |

---

## Referencias

- [Estrategia .env](/decisiones/env-strategy.md) — dónde viven los secretos y cómo se nombran
- [Disaster Recovery](/disaster-recovery.md) — rotación de emergencia como parte del Escenario F (brecha)
- [Supply Chain](/supply-chain.md) — prevenir que secretos entren via dependencias comprometidas
- [Auditoría](/auditoria.md) — registrar rotaciones de secretos en el audit log como eventos de seguridad
- [Fase 6 — Seguridad](/fases/fase-6-seguridad.md) — Semgrep detecta secretos hardcodeados en pre-commit
