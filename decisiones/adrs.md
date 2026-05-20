# ADRs (Architecture Decision Records)

Cada decisión técnica importante se documenta como un ADR para que quede registro del **por qué** de la elección, no solo del resultado.

## Formato

```markdown
# ADR-NNN: Título descriptivo

**Estado:** [Aceptado | Propuesto | Deprecado]

**Contexto:** ¿Qué problema estábamos resolviendo? ¿Qué opciones consideramos?

**Decisión:** ¿Qué elegimos y por qué?

**Consecuencias:** ¿Qué trade-offs aceptamos? ¿Qué cambia?
```

## Cuándo crear un ADR

- Cambio de stack (Prisma → Drizzle, PostgreSQL → SQLite)
- Nueva integración externa (Stripe, Resend, Supabase)
- Cambio de arquitectura (REST → GraphQL, monolith → microservices)
- Estrategia de datos (sharding, replicación, soft delete)
- Decisiones de seguridad (auth flow, rate limiting strategy)

## ADRs iniciales recomendados

```
docs/adr/
├── adr-001-stack-tecnologico.md    — Next.js + TypeScript + Prisma + PostgreSQL
├── adr-002-bdd-playwright.md       — Playwright BDD vs Cucumber.js
├── adr-003-error-handling.md       — Error Boundaries + TanStack Query + Sentry
└── adr-004-testing-strategy.md     — Vitest + SQLite + MSW
```

## Dónde se crean

Los ADRs se crean durante la **Fase 10 (Documentación)**, pero pueden añadirse en cualquier momento cuando surge una decisión importante.
