# Estrategia de Data Seeding

Documenta cómo se siembran datos de prueba, desarrollo y demostración usando Prisma + faker.js.

## Patrón de Seed con Prisma + tsx

Configuración en `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Ejecutar:

```bash
npx prisma db seed
```

## Factories con faker.js

Usamos `@faker-js/faker` para generar datos realistas:

```typescript
// prisma/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import type { Prisma } from '@prisma/client';

export function createUserFactory(
  overrides?: Partial<Prisma.UserCreateInput>,
): Prisma.UserCreateInput {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    image: faker.image.avatar(),
    emailVerified: faker.date.past(),
    ...overrides,
  };
}
```

## Múltiples Archivos de Seed

Separamos por propósito:

```
prisma/
├── seed.ts                 # Entry point — invoca según entorno
├── seed.dev.ts             # Datos ricos para desarrollo local
├── seed.test.ts            # Datos mínimos y predecibles para tests
└── seed.demo.ts            # Demo pulida para stakeholders
```

Entry point (`prisma/seed.ts`):

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const env = process.env.NODE_ENV ?? 'development';

async function main() {
  switch (env) {
    case 'development':
      return (await import('./seed.dev')).seed(prisma);
    case 'test':
      return (await import('./seed.test')).seed(prisma);
    case 'demo':
      return (await import('./seed.demo')).seed(prisma);
    default:
      return (await import('./seed.dev')).seed(prisma);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

## Seeds Idempotentes

Usamos `upsert` en vez de `create` para poder re-ejecutar sin duplicar:

```typescript
// prisma/seed.dev.ts
export async function seed(prisma: PrismaClient) {
  const user = await prisma.user.upsert({
    where: { email: 'dev@ejemplo.com' },
    update: { name: 'Usuario Dev' },
    create: {
      email: 'dev@ejemplo.com',
      name: 'Usuario Dev',
    },
  });
  console.log(`Seed completado: ${user.email}`);
}
```

## Seed de Datos Relacionales

Usuarios con órdenes y suscripciones en cascada:

```typescript
export async function seed(prisma: PrismaClient) {
  const user = await prisma.user.upsert({
    where: { email: 'cliente@ejemplo.com' },
    update: {},
    create: {
      email: 'cliente@ejemplo.com',
      name: 'Cliente Demo',
      orders: {
        create: [
          {
            id: 'ord_demo_001',
            amount: 4999,
            currency: 'usd',
            status: 'paid',
            stripePaymentIntentId: 'pi_demo_001',
          },
        ],
      },
      subscription: {
        create: {
          id: 'sub_demo_001',
          plan: 'pro',
          status: 'active',
          stripeSubscriptionId: 'sub_demo_stripe',
        },
      },
    },
    include: { orders: true, subscription: true },
  });
}
```

## Seeds por Entorno

| Entorno      | Propósito                          | Cantidad de registros |
|-------------|------------------------------------|----------------------|
| development | Mock rico para desarrollo diario   | ~100 usuarios, 500 órdenes |
| test        | Datos deterministas para tests     | 5–10 usuarios, 20 órdenes |
| demo        | Data curada para demos             | 20 usuarios, órdenes variadas |

Ejecutar seed de test:

```bash
NODE_ENV=test npx prisma db seed
```

## Referencias

- [Migraciones](/migrations.md) — los seeds corren después de `prisma migrate deploy`
- [Estrategia .env](/decisiones/env-strategy.md) — `.env.test` para la BD de test que recibe los seeds
- [Testing](/testing.md) — los seeds de test proveen los fixtures para los escenarios BDD
