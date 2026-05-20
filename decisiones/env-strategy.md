# Estrategia de Entornos (.env)

## Archivos

| Archivo | Cuándo se usa | Contenido |
|---|---|---|
| `.env.local` | Desarrollo local | Sobreescribe todo, valores reales |
| `.env.development` | Preview Vercel | BD preview, API keys de prueba |
| `.env.production` | Producción Vercel | BD producción, API keys reales |
| `.env.example` | Repositorio (git) | Template sin valores sensibles |

## Template `.env.example`

```env
# Base de datos
DATABASE_URL=postgresql://postgres:***@localhost:5432/myapp

# Autenticación
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

# Sentry (errores)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Upstash (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Reglas estrictas

1. **NUNCA** subir `.env.local`, `.env.development`, `.env.production` a git
2. `.env.example` **SIEMPRE** en git (es el contrato de variables necesarias)
3. Vercel: configurar variables en Project Settings → Environment Variables
4. Prisma: `DATABASE_URL` se configura por entorno en Vercel

## Comandos útiles

```bash
# Generar AUTH_SECRET
openssl rand -base64 32
```
