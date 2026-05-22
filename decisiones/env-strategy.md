# Estrategia .env

## Archivos por entorno

| Archivo | Cuándo se usa | Contenido | En git |
|---|---|---|---|
| `.env.local` | Desarrollo local | Valores reales del dev | ❌ Nunca |
| `.env.test` | Tests (Vitest / Playwright) | BD en memoria, mocks | ❌ Nunca |
| `.env.development` | Preview Vercel | BD preview, API keys de prueba | ❌ Nunca |
| `.env.production` | Producción Vercel | BD producción, API keys reales | ❌ Nunca |
| `.env.example` | Repo (git) | Template sin valores — es el contrato | ✅ Siempre |

## Convención de nombres

```
# Variable del servidor (nunca expuesta al cliente)
DATABASE_URL=
STRIPE_SECRET_KEY=
SENTRY_AUTH_TOKEN=

# Variable pública (expuesta al bundle del cliente con Next.js)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
```

**Regla:** Solo usar el prefijo `NEXT_PUBLIC_` para variables que el cliente necesita leer directamente. Nunca poner secretos con ese prefijo.

## Template `.env.example`

```env
# Base de datos
DATABASE_URL=postgresql://postgres:***@localhost:5432/myapp

# Autenticación (Auth.js)
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (email)
RESEND_API_KEY=

# Stripe (pagos)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Sentry (errores y monitoreo)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Logging
LOG_LEVEL=info
```

## Reglas

1. **Nunca** subir `.env.local`, `.env.test`, `.env.development`, `.env.production` a git
2. `.env.example` **siempre** en git — es el contrato de variables que el proyecto necesita
3. **Toda variable nueva** debe agregarse a `.env.example` en el mismo commit donde se usa
4. Vercel: configurar en Project Settings → Environment Variables (separado por entorno)
5. `DATABASE_URL` en Vercel apunta a la BD de cada entorno — nunca usar la de producción en preview
6. Variables en `.env.test`: usar SQLite en memoria o URLs de test para no tocar datos reales

## .gitignore mínimo

```
.env
.env.local
.env.test
.env.development
.env.production
```

## Comandos útiles

```bash
# Generar AUTH_SECRET
openssl rand -base64 32

# Verificar que no hay secretos accidentalmente en git
git ls-files | grep '\.env'   # solo debe aparecer .env.example
```

## Cuándo actualizar `.env.example`

El agente actualiza `.env.example` en el mismo PR donde se introduce la nueva variable. Si se elimina una variable, también se elimina del ejemplo. Este documento es el contrato — debe estar siempre sincronizado con el código.

## Referencias

- [Rate Limiting](/decisiones/rate-limiting.md) — variables Upstash
- [Sentry](/sentry.md) — variables DSN y auth token
- [Sesiones](/sesiones.md) — `AUTH_SECRET` y providers OAuth
- [Fase 9 — CI/CD](/fases/fase-9-cicd.md) — variables en pipeline de Vercel
