# 📦 Stack Tecnológico

Decisiones concretas del stack para aplicaciones Next.js + PostgreSQL con SDD + BDD.

## Stack Table

| Componente | Elección | Justificación |
|------------|----------|---------------|
| **Framework** | Next.js 14+ (App Router) | Full-stack React, SSR, RSC |
| **Lenguaje** | TypeScript strict | Seguridad de tipos, escalabilidad |
| **ORM** | Prisma + DTOs con Zod | Tipo seguro, validación compartida cliente/servidor |
| **Base de datos** | PostgreSQL | Relacional, maduro, full-text search nativo |
| **Auth** | Auth.js v5 | Multi-provider, adapter para Prisma |
| **API paradigm** | REST (Route Handlers) | Simple, predecible, stateless |
| **BDD** | Playwright BDD | Sin Cucumber como dependencia extra, mismo Gherkin |
| **Testing unit/integration** | Vitest + MSW | Rápido, coverage, mocks en capa de red |
| **Form handling** | React Hook Form + Zod resolver | Validación compartida cliente/servidor |
| **Server state** | TanStack Query | Caching, refetch, loading states, error handling |
| **Client state** | Zustand (bajo demanda) | 1KB, sin boilerplate |
| **Background jobs** | Vercel Cron | Sin infra extra, serverless |
| **File storage** | Supabase Storage | API S3-compatible, gratis 1GB |
| **Email** | Resend | API simple, React Email, gratis 100/día |
| **Full-text search** | PostgreSQL (pg_trgm + tsvector) | Sin servicios extra |
| **Payments** | Stripe | Estándar de la industria |
| **i18n** | next-intl | Estándar Next.js App Router, RSC-compatible |
| **Pre-commit** | Husky + lint-staged + Semgrep | Linter automático + seguridad en cada commit |
| **Deploy** | Vercel | Optimizado para Next.js, preview deploys |
| **CI/CD** | GitHub Actions | Integrado con GitHub, gratis |
| **Observabilidad** | Sentry + Pino | Error tracking + logging estructurado |
| **Mocks HTTP** | MSW (Mock Service Worker) | Intercepta en capa de red, compatible con fetch/axios/TanStack Query |
| **Error boundaries** | React Error Boundaries + Sentry | Captura errores de render, UI de respaldo, loggeo |
| **Performance** | Core Web Vitals + next/image + code splitting | LCP < 2.5s, CLS < 0.1 |
| **Accesibilidad** | WCAG 2.1 AA + axe en tests automatizados | Contraste, teclado, lectores de pantalla |
| **SEO** | generateMetadata, sitemap.xml, Open Graph | Para páginas públicas de la app |
| **Memoria persistente** | PostgreSQL 17 + pgvector | Búsqueda semántica RAG, versionada, cross-platform |

---

## Git & Branching

- **Estrategia:** Feature branches con squash merge
- Cada feature/fix en su propia branch: `feat/nombre`, `fix/descripcion`, `refactor/area`
- El agente crea la branch, hace commits incrementales durante desarrollo
- Al mergear a `main`: **squash merge** → un solo commit limpio por PR
- Commits convencionales: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:`

```
main ──────┬───────────┬───────────┬──────
            \          /           /
             \── feat/auth ───────/
                  (squash merge)
```

---

## Pre-commit Hooks (Husky + lint-staged + Semgrep)

```bash
npx husky init
```

Contenido de `.husky/pre-commit`:
```bash
npx lint-staged
semgrep --config=auto --error
```

Esto corre **ESLint + Prettier + Semgrep** antes de cada commit. Semgrep detecta vulnerabilidades de seguridad (SQL injection, hardcoded secrets, XSS, etc.) en el código automáticamente.

- **lint-staged:** corre ESLint + Prettier solo en archivos staged
- **Semgrep:** análisis estático de seguridad
- Se ejecuta en cada `git commit`, bloquea si hay errores

---

## Docker

No se usa Docker para el pipeline. **Vercel** maneja builds y preview environments automáticamente desde cada PR.

Si se necesita PostgreSQL local para desarrollo, se puede usar Docker Compose opcional:

```yaml
# docker-compose.yml (opcional, solo dev local)
services:
  db:
    image: postgres:16-alpine
    ports: ['5432:5432']
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: localdev
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

La app Next.js corre en el host, no en Docker.
