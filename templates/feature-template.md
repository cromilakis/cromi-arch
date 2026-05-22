# Plantilla de Feature BDD (Playwright BDD)

Copia este archivo a `features/<dominio>/<feature>.feature`.

## Formato Gherkin

```gherkin
Feature: [Nombre de la Feature]
  Como un [rol de usuario]
  Quiero [acción o capacidad]
  Para [beneficio o valor de negocio]

  Background:
    Given [contexto inicial que aplica a todos los escenarios]

  @happy-path
  Scenario: [Nombre del escenario feliz]
    Given [precondición 1]
    And [precondición 2]
    When [acción del usuario]
    And [acción adicional]
    Then [resultado esperado 1]
    And [resultado esperado 2]

  @error
  Scenario: [Nombre del escenario de error]
    Given [precondición]
    When [acción que causa el error]
    Then [mensaje de error esperado]

  @edge-case
  Scenario: [Nombre del escenario límite]
    Given [precondición límite]
    When [acción]
    Then [comportamiento esperado en el límite]

  @validation
  Scenario Outline: [Validación de campo]
    Given un usuario en [página/formulario]
    When completa [campo] con <valor>
    Then ve el error <error>

    Examples:
      | valor       | error                    |
      | ""          | "Este campo es requerido"|
      | "invalido"  | "Formato inválido"       |
```

## Ejemplo Completo

```gherkin
# features/api/users.feature
Feature: API de Usuarios
  Como un desarrollador frontend
  Quiero una API REST para usuarios
  Para poder integrar el frontend con el backend

  Background:
    Given la base de datos tiene los siguientes usuarios:
      | id | name | email              |
      | 1  | Ana  | ana@example.com    |
      | 2  | Bob  | bob@example.com    |

  @happy-path
  Scenario: Listar todos los usuarios
    When hago GET a "/api/users"
    Then la respuesta es 200
    And el cuerpo contiene 2 usuarios

  @happy-path
  Scenario: Obtener usuario por ID
    When hago GET a "/api/users/1"
    Then la respuesta es 200
    And el usuario tiene name "Ana"

  @error
  Scenario: Usuario no encontrado
    When hago GET a "/api/users/999"
    Then la respuesta es 404
    And el error es "User not found"

  @validation
  Scenario: Crear usuario sin nombre
    When hago POST a "/api/users" con:
      | email             |
      | nuevo@test.com    |
    Then la respuesta es 400
    And el error es "Name is required"

  @security
  Scenario: Acceso sin autenticación
    Given no hay sesión activa
    When hago GET a "/api/users"
    Then la respuesta es 401
```

## Step Definitions (TypeScript)

```typescript
// features/api/steps/users.steps.ts
import { createBdd } from 'playwright-bdd';
import { test, expect } from '../../playwright/fixtures';
import { seedUsers, cleanDB } from '../../test-utils/db';
import type { APIResponse } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

// Variables de módulo para compartir estado entre steps
let response: APIResponse;
let body: unknown;

Given('la base de datos tiene los siguientes usuarios:', async (_, dataTable: any) => {
  await cleanDB();
  await seedUsers(dataTable.hashes());
});

When('hago GET a {string}', async ({ request }, url: string) => {
  response = await request.get(url);
  body = await response.json();
});

Then('la respuesta es {int}', async (_, statusCode: number) => {
  expect(response.status()).toBe(statusCode);
});

Then('el cuerpo contiene {int} usuarios', async (_, count: number) => {
  expect(Array.isArray(body)).toBe(true);
  expect((body as unknown[]).length).toBe(count);
});
```

## Convenciones

- **Tags**: `@happy-path`, `@error`, `@edge-case`, `@validation`, `@security`, `@performance`
- **Background**: contexto compartido entre escenarios de un feature
- **Scenario Outline**: para pruebas parametrizadas (tabla Examples)
- **Un feature por archivo**, un archivo por dominio funcional
- **Step Definitions** en `features/<dominio>/steps/`

## Comandos

```bash
# Generar tests desde features y ejecutar
npx bddgen && npx playwright test

# Solo un feature específico
npx bddgen && npx playwright test --grep "Registro"

# Modo UI interactivo
npx bddgen && npx playwright test --ui
```

## Referencias

- [Tasks Override](/templates/tasks-override.md) — ciclo completo RED → GREEN → REFACTOR → commit
- [Testing](/testing.md) — configuración de Playwright BDD, fixtures y cobertura mínima
- [API Docs](/api-docs.md) — formato de respuesta `{ error, code }` para escenarios `@error` y `@validation`
