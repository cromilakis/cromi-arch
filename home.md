# 🏗️ Engineering Playbook — SDD + BDD Harness

Bienvenido a la **documentación viva** del harness de desarrollo agéntico SDD + BDD. Este sistema orquesta el ciclo de vida completo de aplicaciones Next.js + PostgreSQL usando **Spec Kit** para diseño (SDD), **Playwright BDD** para implementación dirigida por comportamiento, y un sistema de **memoria persistente** (pgvector) para continuidad entre sesiones y plataformas.

---

## Tradicional vs Este Harness

| Aspecto | Desarrollo Tradicional | Este Harness |
|---------|----------------------|--------------|
| **Inicio** | Tareas sueltas, todo en la cabeza | Spec Kit formaliza requisitos antes de codear |
| **Testing** | Unit tests primero o después | BDD (Gherkin) primero — RED → GREEN → REFACTOR |
| **Errores** | Console.log, pantalla blanca | 5 capas (Zod → API → TanStack Query → Error Boundary → Sentry) |
| **Memoria** | El desarrollador recuerda todo | PostgreSQL + pgvector con RAG, versionado y expiración |
| **CI/CD** | Manual o básico | GitHub Actions + Vercel + 7 gates automáticos |
| **Cobertura** | Sin umbral definido | 80% lines, 70% functions/branches |
| **Seguridad** | Después del MVP | Day 1: Semgrep, rate limiting, Zod validation |
| **Costos** | Sin control | Free tier piloto ($0/mes), ~$91/mes escalado |

---

## Qué encontrarás aquí

| Página | Descripción |
|--------|-------------|
| [📦 Stack Tecnológico](stack.md) | Decisiones concretas del stack, Git branching, pre-commit hooks y Docker |
| [💰 Costos Estimados](costos.md) | Tablas de costos free tier y escalado, estrategia de backups |
| [🧠 Memoria Persistente](memoria.md) | PostgreSQL + pgvector, esquema, tipos de memoria, CLI script |
| [🧪 Testing](testing.md) | Vitest, SQLite en memoria, MSW mocks, coverage thresholds |
| [⚠️ Error Handling](error-handling.md) | Estrategia de 5 capas, Error Boundary, TanStack Query, API Error Format |

---

> **Filosofía:** Cada línea de código comienza con un requisito especificado, un escenario Gherkin escrito, y un gate humano que lo aprueba. Nada se implementa sin antes estar especificado y acordado.
