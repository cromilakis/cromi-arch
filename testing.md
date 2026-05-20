# 🧪 Estrategia de Testing

Testing integral con múltiples capas: unitario, integración, BDD E2E y accesibilidad.

---

## Stack de Testing

| Tipo | Herramienta | Propósito |
|------|------------|-----------|
| Unitario | Vitest + SQLite en memoria | Tests rápidos de lógica, validación Zod, helpers |
| Integración | Vitest + SQLite (Prisma push) | Test de queries a BD sin PostgreSQL real |
| BDD E2E | Playwright BDD | Tests funcionales desde el navegador |
| Accesibilidad | axe-playwright | Auditoría WCAG automatizada en tests E2E |

---

## Vitest Config

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 70,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

### Coverage Thresholds

| Métrica | Mínimo |
|---------|--------|
| Lines | 80% |
| Functions | 70% |
| Branches | 70% |
| Statements | 80% |

---

## Tests de Integración con SQLite + Prisma

Estrategia simple: levantar una BD SQLite en memoria, correr las migraciones, y ejecutar los tests. Rápido, sin dependencias externas.

```ts
// tests/setup.ts
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient({
  datasources: { db: { url: 'file:./test.db' } },
})

beforeAll(async () => {
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  })
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

export { prisma }
```

---

## Mocks con MSW (Mock Service Worker)

MSW intercepta peticiones HTTP en la capa de red, funciona igual con `fetch`, `axios`, o `TanStack Query`.

```ts
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Test User' },
    ])
  }),
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json()
    if (!body.email) {
      return HttpResponse.json({ error: 'Email required' }, { status: 400 })
    }
    return HttpResponse.json({ token: 'mock-jwt' })
  }),
]

// tests/setup.ts (adicional)
import { setupServer } from 'msw/node'
export const server = setupServer(...handlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## BDD con Playwright BDD

Playwright BDD integra Gherkin directamente con Playwright — no necesitas Cucumber.js aparte. Los feature files generan tests de Playwright automáticamente.

```gherkin
# features/auth/registration.feature
Feature: Registro de Usuarios
  Como un visitante
  Quiero registrarme
  Para acceder a funcionalidades protegidas

  Scenario: Registro exitoso
    Given un visitante en /register
    When completa registro con email "user@test.com" y password "Pass1234!"
    Then ve mensaje "Cuenta creada"
    And es redirigido al dashboard
```

Comando para correr:
```bash
npx bddgen && npx playwright test
```

### Ventajas de Playwright BDD sobre Cucumber.js

- Sin dependencia extra de Cucumber
- TypeScript nativo sin config adicional
- Mismos fixtures de Playwright (page, context, browser)
- Generación automática de tests desde .feature
- Screenshots, video, trace por defecto en fallos
