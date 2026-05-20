# Spec-Prompt: Inicialización del Harness SDD + BDD

Usa este prompt cuando inicies un nuevo proyecto o feature con el harness. Copia y pega en la sesión de Hermes Agent.

## Para iniciar un proyecto NUEVO

```markdown
Inicia el desarrollo de una nueva aplicación con el stack:

**Stack:**
- Next.js 14+ (App Router) con TypeScript strict
- PostgreSQL con Prisma ORM
- Auth.js (NextAuth) v5
- Zod para validación
- Cucumber + Playwright para BDD
- Sentry + Pino para monitoreo

**Metodología:**
SDD (Spec Kit) para especificaciones → BDD (Gherkin) para implementación

**Fases:**
Ejecuta el ciclo completo de 10 fases con gates humanos:
1. Intake — desambigua y define alcance
2. SDD Spec — genera spec.md
3. Análisis de Riesgos — seguridad, datos, rendimiento
4. Arquitectura — plan.md, architecture.md, contracts/
5. Tareas BDD-Ready — tasks.md
6. Implementación BDD — features → steps → código (RED→GREEN→REFACTOR)
7. Seguridad — checklist completo + fixes
8. Testing Integral — unit, integration, BDD E2E, accesibilidad
9. Monitoreo — Sentry, logging, health checks
10. Documentación — ADRs, runbook, docs/
11. CI/CD — GitHub Actions, Docker, deploy

Skill cargado: sdd-bdd-agentic-harness

Comienza con la Fase 0: dime qué quieres construir.
```

## Para una FEATURE nueva en proyecto existente

```markdown
Nueva feature para proyecto existente:

Stack: Next.js App Router + TypeScript + PostgreSQL + Prisma
Metodología: SDD → BDD

Skill cargado: sdd-bdd-agentic-harness

Fases a ejecutar:
1. SDD Spec — speckit.specify
2. Análisis de Riesgos
3. Arquitectura — speckit.plan
4. Tareas — speckit.tasks
5. Implementación BDD (RED→GREEN→REFACTOR)
6. Seguridad
7. Testing

Comienza con Fase 1: la feature es [descripción].
```

## Prompt para el harness (cuando el agente NO tiene Spec Kit como comando nativo)

```markdown
Eres un harness de desarrollo autónomo. Tu stack objetivo es:
Next.js App Router + TypeScript strict + PostgreSQL + Prisma + BDD (Cucumber/Gherkin).

No tienes Spec Kit como comando nativo de Hermes, así que:
1. Genera manualmente los artefactos SDD (spec.md, plan.md, tasks.md)
2. Usa la estructura de directorios specs/NNN-feature/
3. Implementa con BDD cycle (feature file → steps → código)
4. En cada gate, pregúntame si apruebo antes de continuar

Skill cargado: sdd-bdd-agentic-harness

¿Qué vamos a construir?
```
