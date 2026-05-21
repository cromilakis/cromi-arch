# 💰 Costos Estimados

Estrategia **Free Tier First**: para apps piloto los free tiers alcanzan. Se escala solo cuando la app valida tracción.

---

## Fase Piloto (Free Tier, Sin Tráfico)

| Servicio | Costo/mes | Límites free |
|----------|-----------|-------------|
| Vercel | $0 | 100GB banda, 6000 min build |
| Supabase | $0 | 500MB DB, 5GB banda, 50K usuarios |
| Resend | $0 | 3000 emails/mes (100/día) |
| Sentry | $0 | 5000 eventos/mes |
| Stripe | $0 | Sin cargo fijo (solo 2.9% + $0.30/tx) |
| GitHub Actions | $0 | 2000 min/mes |
| Semgrep | $0 | Open source |
| **Total** | **$0/mes** | |

---

## Fase Escalada (Con Usuarios Reales)

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| Vercel Pro | Builds concurrentes, +ancho banda | $20 |
| Supabase Pro | 8GB DB, 250GB banda, 100K usuarios | $25 |
| Resend Growth | 50K emails/mes | $20 |
| Sentry Team | 50K eventos/mes | $20 |
| Stripe | Solo comisión por transacción | variable |
| **Total** | | **~$85/mes + fees** |

---

## Resumen Free Tier por Servicio

| Servicio | Free tier | Escala |
|----------|-----------|--------|
| Vercel | 100GB ancho banda, 6000 min build/mes | Pro ($20) |
| Supabase | 500MB DB, 1GB storage, 50K users | Pro ($25) |
| Resend | 100 emails/día | Growth ($20) |
| Sentry | 5000 eventos/mes | Team ($20) |
| Stripe | Sin cargo fijo, solo comisión | Por transacción |
| GitHub Actions | 2000 min/mes gratis | -- |

---

## Backups

- **Supabase**: backups automáticos diarios con retención 7 días (incluidos en el plan)
- **Schema**: versionado en git vía Prisma migrations (el esquema es reproducible desde código)
- **Opcional**: `pg_dump` semanal a Cloudflare R2 (10GB gratis) o GitHub Releases
- **Storage (archivos)**: Supabase Storage maneja redundancia propia

### Estrategia de Respaldo

| Tipo | Método | Retención |
|------|--------|-----------|
| Base de datos | Supabase automático | 7 días |
| Schema (DDL) | Prisma migrations en git | ∞ (historial git) |
| Archivos | Supabase Storage redundante | ∞ |
| Extra (opcional) | pg_dump → R2 / GitHub Releases | Configurable |

## Referencias

- [Migraciones](/migrations.md) — el schema versionado en git es parte de la estrategia de backup
- [Estrategia .env](/decisiones/env-strategy.md) — variables de Supabase, Resend, Sentry, Stripe por entorno
- [Fase 9 — CI/CD](/fases/fase-9-cicd.md) — GitHub Actions consume los 2000 min/mes del free tier
- [Sentry](/sentry.md) — configuración del plan free (5000 eventos) y cuándo escalar a Team
