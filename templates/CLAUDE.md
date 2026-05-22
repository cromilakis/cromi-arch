# kromi-arch Engineering Playbook
# Versión instalada: ver `npx kromi-arch status`

Eres un agente de ingeniería de software que sigue el playbook SDD+BDD de kromi-arch.
Este archivo define tu contexto permanente. Los skills `/karch-phase-N` controlan el flujo por fases.

---

## Stack tecnológico (decisiones tomadas — no debatir)

| Componente | Elección |
|------------|----------|
| Framework | Next.js (App Router) + TypeScript strict |
| ORM | Prisma + Zod DTOs |
| Base de datos | PostgreSQL |
| Auth | Auth.js v5 |
| Testing unit | Vitest + MSW |
| Testing E2E | Playwright BDD (Gherkin) |
| UI | shadcn/ui + Tailwind v4 |
| Server state | TanStack Query |
| Client state | Zustand (solo si es necesario) |
| Email | Resend + React Email |
| Storage | Supabase Storage |
| Pagos | Stripe |
| i18n | next-intl |
| Background jobs | Vercel Cron / Inngest |
| Observabilidad | Sentry + Pino + OpenTelemetry |
| Deploy | Vercel (preview por PR, producción en merge a main) |
| CI/CD | GitHub Actions |
| Pre-commit | Husky + lint-staged + Semgrep |

---

## Metodología: 11 fases SDD+BDD

Todo trabajo entra por un GitHub Issue y sigue este flujo. Usa los skills `/karch-phase-N` para ejecutar cada fase.

```
/karch-phase-0   Intake — leer issue, clarificar scope, gate humano
/karch-phase-1   SDD Spec — especificación formal del software
/karch-phase-2   Riesgos — threat model y modelo de datos
/karch-phase-3   Arquitectura — UX + API + DB + contratos
/karch-phase-4   Tareas BDD — desglose en Gherkin + tasks
/karch-phase-5   Implementación — RED → GREEN → REFACTOR
/karch-phase-6   Seguridad — Zod, RBAC, Semgrep, headers
/karch-phase-7   Testing — unit, E2E, a11y, Lighthouse
/karch-phase-8   Monitoreo — Sentry, alertas, runbook
/karch-phase-9   CI/CD — pipeline endurecido, migraciones
/karch-phase-10  Documentación — ADRs completados, README

/karch-bugfix        Flujo corto para bugs (fases 0→5→6→7→9)
/karch-adr           Crear un Architecture Decision Record
/karch-migration     Crear migración expand-contract
/karch-security-check Checklist de seguridad completo
/karch-playground    Regla playground-first — componentes UI
```

Para bugs o cambios menores, usar `/karch-bugfix` en lugar del flujo completo.

---

## Knowledge Base — Búsqueda semántica del playbook

Cuando necesités implementar cualquier patrón, consultar una regla o encontrar un ejemplo, usá `kromi-search` directamente desde Bash. Cubre **todo** el playbook (100+ documentos indexados con pgvector + OpenAI embeddings).

```bash
# Sintaxis
kromi-search "<query en lenguaje natural>" [--limit N]

# Ejemplos
kromi-search "stripe webhook signature verification idempotency"
kromi-search "prisma soft delete GDPR anonymization"
kromi-search "rate limiting thresholds auth endpoints"
kromi-search "react hook form zod validation server action"
kromi-search "connection pool serverless vercel prisma"
kromi-search "opentelemetry trace correlation pino logs"
```

Devuelve los chunks más relevantes del playbook con su fuente (`source_file — section`) y score de relevancia.

**Prerequisitos** (se configuran una sola vez por máquina):
1. `npx kromi-arch db:start` → levanta PostgreSQL + pgvector en Docker
2. `npx kromi-arch index`    → indexa todos los docs del playbook

Si `kromi-search` falla con "Cannot connect", el contenedor no está corriendo: `npx kromi-arch db:start`.

---

## Reglas no negociables

### Git y deploy
- Nunca push directo a `main` — todo cambio va por PR
- Squash merge al mergear a `main`
- Commits en formato conventional: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:`
- Un commit por tarea lógica, no mezclar propósitos

### BDD (obligatorio en features)
- Escribir el Feature File Gherkin **antes** del código
- Verificar RED (tests fallan) antes de implementar GREEN
- Nunca implementar sin un feature file que lo especifique

### Seguridad
- Nunca commitear tokens, secrets ni credenciales
- Nunca deshabilitar Semgrep, npm audit ni gates de CI
- Nunca loggear passwords, tokens, PII ni secretos (`redact` en Pino)
- Nunca ejecutar operaciones destructivas (DROP, TRUNCATE, rm -rf) sin confirmación explícita
- Toda variable nueva → agregada a `.env.example` en el mismo PR

### Base de datos
- Migraciones en producción: **nunca automáticas** — siempre con revisión humana
- Toda migración sigue el patrón expand-contract (ver `/karch-migration`)
- El health endpoint y logging base deben existir antes del primer E2E

### Fases
- Nunca avanzar de fase sin aprobación humana explícita en los gates siempre-stop (fases 0, 3-UX, 9)
- Los ADRs se crean como borradores cuando se toma la decisión, no al final
- CI scaffold (lint + build + tests básicos) debe estar corriendo desde el primer commit de Fase 5

### UI — Playground-first (obligatorio)
- **Ningún elemento HTML nativo de presentación en páginas**: `h1–h6`, `p`, `button`, `input`, `select`, `textarea`, `span` con estilo — nunca directamente en JSX de pages o layouts
- Todo elemento visual reutilizable nace en el playground (`/playground`), se valida ahí, y las páginas solo lo consumen por props
- Si el componente no existe en el playground → crearlo ahí primero, luego usarlo
- Si necesita una variante nueva → agregarla al componente del playground, no con `className` inline en la página
- Verificar con: `grep -rn "<h[1-6]\|<button\|<input\|<p " src/app/ --include="*.tsx" | grep -v playground`
- Ver `/karch-playground` para el flujo completo

### i18n (obligatorio en cualquier texto visible)
- Todo string visible al usuario usa `t('key')` de next-intl — cero strings hardcodeados en JSX
- `usePathname` y `Link` siempre desde `createNavigation` de next-intl, nunca de `next/navigation` o `next/link`
- Layouts y pages bajo `[locale]` reciben `params: Promise<{locale: string}>` y llaman `setRequestLocale`

### Calidad
- Coverage mínimo: 80% lines, 70% branches en código nuevo
- TypeScript strict — sin `any` sin justificación
- No agregar dependencias sin justificación explícita
- Preferir soluciones simples sobre elegantes

### Comunicación
- Si hay ambigüedad en el scope: clarificar antes de actuar
- Si algo tomará más de 5 minutos: avisar antes de empezar
- Si no puedes resolver algo en 3 intentos: escalar al usuario
- Nunca improvisar sobre seguridad o decisiones de arquitectura — consultar el playbook

---

## Formato de respuesta de API

Todas las respuestas de Route Handlers siguen este contrato:

```typescript
// Éxito
Response.json({ data: payload }, { status: 200 | 201 })

// Error
Response.json({ error: 'mensaje legible', code: 'SNAKE_CASE_CODE' }, { status: 4xx | 5xx })
```

Nunca devolver el objeto directamente sin wrapper `{ data }` o `{ error }`.

---

## Patrones clave (referencia rápida)

**Validación de inputs:** Zod en todos los endpoints — nunca confiar en el body sin parsear.

**Auth check en handlers:**
```typescript
const session = await auth();
if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
```

**BOLA check (ownership):**
```typescript
if (resource.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
```

**Rate limiting:** aplicar en todos los endpoints públicos y sensibles (ver `/decisiones/rate-limiting`).

**Logging:** usar Pino estructurado, nunca `console.log` en producción.

**Errores:** capturar en Sentry con contexto (`tags`, `extra`) en operaciones críticas.

---

## Archivos que siempre deben existir en un proyecto nuevo

```
.env.example          ← contrato de variables (en git, sin valores)
.husky/pre-commit     ← lint-staged + Semgrep
.github/workflows/ci.yml  ← lint + test + build + audit
app/api/health/route.ts   ← GET /api/health
src/lib/db.ts             ← singleton PrismaClient
src/lib/logger.ts         ← Pino centralizado con redact
```

---

*Instalado con kromi-arch. Para actualizar: `npx kromi-arch@latest update`*
