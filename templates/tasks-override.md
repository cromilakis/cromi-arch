# Tareas — SDD + BDD

Cada tarea sigue el ciclo BDD completo: Feature File (Gherkin) → Step Definitions (Playwright BDD) → Código.

## Task N: [Nombre descriptivo]

**Archivos:**
- Crear (Feature): `features/<dominio>/<feature>.feature`
- Crear (Steps): `features/<dominio>/steps/<feature>.steps.ts`
- Crear/Modificar (Código): `src/<ruta>/<archivo>.ts`
- Test Unitario: `src/__tests__/<archivo>.test.ts`

**Paso 1 — RED: Escribir Feature File (Gherkin)**

Crea `features/<dominio>/<feature>.feature` con escenarios Given/When/Then.
Un comportamiento por escenario. Tags: `@happy-path`, `@error`, `@edge-case`, `@validation`.

```gherkin
Feature: [Nombre]
  Scenario: [Comportamiento]
    Given [precondición]
    When [acción]
    Then [resultado]
```

**Paso 2 — RED: Escribir Step Definitions (Playwright BDD)**

Crea `features/<dominio>/steps/<feature>.steps.ts` usando `createBdd` de `playwright-bdd`.
Implementa los steps para que fallen (throw new Error o steps vacíos).

```typescript
import { createBdd } from 'playwright-bdd';
import { test, expect } from '../../playwright/fixtures';
const { Given, When, Then } = createBdd(test);
// Steps...
```

**Paso 3 — Verificar RED**

```bash
npx bddgen && npx playwright test --grep "<Feature Name>"
```

Esperado: ❌ FALLAN — steps sin implementar

**Paso 4 — GREEN: Implementación mínima**

Escribe el código mínimo en `src/` para que los steps pasen:
- Zod schema para validación
- Prisma query para DB
- Route Handler para API endpoint
- Componente React para UI

**Paso 5 — Verificar GREEN**

```bash
npx bddgen && npx playwright test --grep "<Feature Name>"
```

Esperado: ✅ PASS — todos los escenarios

Luego corre regresión:
```bash
pnpm test
```

**Paso 6 — REFACTOR**

Mejora diseño: extrae helpers, mejora nombres, elimina duplicación.
Los tests deben seguir pasando. No agregues comportamiento.

**Paso 7 — Commit**

```bash
git add features/ src/
git commit -m "feat: implementar [nombre de feature]"
```

---

## Convenciones

- Tags: `@happy-path`, `@error`, `@edge-case`, `@validation`, `@security`
- Scenario Outline para tests parametrizados con tabla Examples
- Background para contexto compartido
- Un commit por tarea, mensaje conventional

## Referencias

- [AGENTS.md](/templates/AGENTS.md) — harness completo que usa estas tareas
- [Feature Template](/templates/feature-template.md) — plantilla de archivos Gherkin + Step Definitions
- [Testing](/testing.md) — configuración de Vitest y Playwright BDD
- [Decisiones: Code Review](/decisiones/code-review.md) — proceso de PR y revisión
