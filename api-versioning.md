# API Versioning

Estrategia para evolucionar la API sin romper clientes existentes.

---

## Cuándo versionar

La mayoría de apps web consumen su propia API — el frontend y el backend se despliegan juntos. En ese caso, los breaking changes se coordinan en el mismo PR y **no se necesita versionar**.

Versionar se vuelve obligatorio cuando:

- Hay **clientes externos** (apps móviles, integraciones de terceros, webhooks consumidos por otros)
- La API es **pública** o documentada como contrato estable
- Hay **múltiples versiones del cliente** en producción simultáneamente (ej: app móvil v1 y v2 coexisten)

Hasta ese momento, mantener `/api/` sin versionar y coordinar cambios en el mismo PR es la estrategia correcta.

---

## Qué es un breaking change

Un breaking change en la API es cualquier cambio que hace fallar un cliente que antes funcionaba.

| Tipo de cambio | ¿Breaking? | Ejemplo |
|----------------|-----------|---------|
| Eliminar un campo de respuesta | ✅ Sí | Quitar `user.phone` del response |
| Renombrar un campo | ✅ Sí | `name` → `fullName` |
| Cambiar tipo de un campo | ✅ Sí | `id: number` → `id: string` |
| Cambiar estructura de paginación | ✅ Sí | `{ items, total }` → `{ data, meta }` |
| Cambiar códigos de error | ✅ Sí | `404` → `422` para recurso no encontrado |
| Hacer obligatorio un campo antes opcional | ✅ Sí | `description` pasa de opcional a requerido |
| Agregar campo nuevo (opcional) a response | ❌ No | Agregar `user.avatarUrl` |
| Agregar campo nuevo (opcional) a request | ❌ No | Agregar `?includeDeleted=true` |
| Corregir un bug que cambia comportamiento | ⚠️ Depende | Si clientes dependían del comportamiento incorrecto, sí |

---

## Estrategia: URL versioning

Elegida sobre header versioning por ser explícita, fácil de testear y directamente compatible con la estructura de carpetas de Next.js App Router.

```
app/
└── api/
    ├── v1/
    │   ├── users/
    │   │   └── route.ts       ← versión estable (en uso)
    │   └── orders/
    │       └── route.ts
    └── v2/
        ├── users/
        │   └── route.ts       ← versión nueva (breaking change)
        └── orders/
            └── route.ts
```

Sin versionar aún (app interna):

```
app/
└── api/
    ├── users/
    │   └── route.ts
    └── orders/
        └── route.ts
```

---

## Implementación en Next.js App Router

### Estructura de versiones

```typescript
// app/api/v1/users/route.ts — versión original
import { getUsersV1 } from '@/lib/api/users';

export async function GET(req: Request) {
  const users = await getUsersV1();
  // Formato v1: { items: [...], total: number }
  return Response.json({ data: users });
}
```

```typescript
// app/api/v2/users/route.ts — nueva versión con breaking change
import { getUsersV2 } from '@/lib/api/users';

export async function GET(req: Request) {
  const users = await getUsersV2();
  // Formato v2: { data: [...], meta: { total, page, perPage } }
  return Response.json({ data: users.items, meta: users.meta });
}
```

### Compartir lógica sin duplicar

La lógica de negocio vive en `lib/`, los handlers de versión solo adaptan el formato:

```
lib/
└── api/
    └── users/
        ├── queries.ts        ← queries Prisma (sin versión, compartida)
        ├── formatters.ts     ← transforma BD → response por versión
        └── schemas.ts        ← Zod schemas por versión
```

```typescript
// lib/api/users/queries.ts — sin versión, compartida por v1 y v2
export async function findUsers(opts: { page: number; limit: number }) {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    prisma.user.count(),
  ]);
  return { items, total, page: opts.page, limit: opts.limit };
}
```

```typescript
// lib/api/users/formatters.ts
export const formatUsersV1 = (result: Awaited<ReturnType<typeof findUsers>>) => ({
  items: result.items,
  total: result.total,
});

export const formatUsersV2 = (result: Awaited<ReturnType<typeof findUsers>>) => ({
  data: result.items,
  meta: {
    total: result.total,
    page: result.page,
    perPage: result.limit,
  },
});
```

### Schemas Zod por versión

```typescript
// lib/api/users/schemas.ts
import { z } from 'zod';

// Compartido entre versiones
const UserBaseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
});

// V1 — sin avatarUrl
export const UserSchemaV1 = UserBaseSchema;

// V2 — agrega avatarUrl (campo nuevo)
export const UserSchemaV2 = UserBaseSchema.extend({
  avatarUrl: z.string().url().nullable(),
});

// Request schemas también se versionan si cambian
export const CreateUserSchemaV1 = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export const CreateUserSchemaV2 = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['user', 'admin']).default('user'), // nuevo campo en V2
});
```

---

## Deprecación

### Proceso

```
1. Publicar V2 — V1 sigue funcionando
2. Anunciar deprecación de V1 (email, changelog, docs)
3. Período de transición — mínimo 90 días para APIs externas
4. Fecha de sunset definida y comunicada
5. Sunset: V1 retorna 410 Gone con mensaje de migración
6. Cleanup: eliminar código de V1
```

### Sunset header (RFC 8594)

Agregar el header `Sunset` a las respuestas de versiones deprecadas para que los clientes sepan cuándo dejará de funcionar:

```typescript
// middleware.ts — agregar Sunset header a rutas v1
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/v1/')) {
    // Deprecation: fecha en que se apaga V1
    response.headers.set('Sunset', 'Sat, 31 Dec 2025 23:59:59 GMT');
    response.headers.set(
      'Deprecation',
      'Sun, 01 Sep 2025 00:00:00 GMT'  // fecha en que se anunció la deprecación
    );
    response.headers.set(
      'Link',
      '</api/v2/users>; rel="successor-version"'
    );
  }

  return response;
}
```

### Respuesta 410 al hacer sunset

```typescript
// app/api/v1/users/route.ts — después del sunset
export async function GET() {
  return Response.json(
    {
      error: 'API v1 ha sido retirada.',
      code: 'API_VERSION_SUNSET',
      migration: 'Actualiza tus llamadas a /api/v2/users. Ver docs: https://docs.tuapp.com/migration/v1-v2',
    },
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

---

## Monitoreo de uso por versión

Antes de apagar una versión, verificar que no haya tráfico real:

```typescript
// middleware.ts — loggear versión usada por cada request
export function middleware(request: NextRequest) {
  const version = request.nextUrl.pathname.match(/\/api\/(v\d+)\//)?.[1];

  if (version) {
    logger.info({
      apiVersion: version,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
    }, 'api_request');
  }

  return NextResponse.next();
}
```

Consulta en Pino / logs para ver si V1 sigue con tráfico antes del sunset:

```bash
# Ver requests a v1 en las últimas 24h
grep '"apiVersion":"v1"' /var/log/app.log | wc -l
```

En Sentry, crear una alerta si la tasa de requests a `/api/v1/` sube inesperadamente después del anuncio de deprecación.

---

## Testing de versiones

Cada versión tiene sus propios tests de contrato — los tests de V1 no se borran mientras V1 esté activa:

```typescript
// tests/api/v1/users.test.ts
describe('GET /api/v1/users', () => {
  it('returns { items, total } format', async () => {
    const res = await fetch('/api/v1/users');
    const body = await res.json();

    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('total');
    expect(body.data).not.toHaveProperty('meta'); // formato V1, no V2
  });
});

// tests/api/v2/users.test.ts
describe('GET /api/v2/users', () => {
  it('returns { data, meta } format', async () => {
    const res = await fetch('/api/v2/users');
    const body = await res.json();

    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.meta).toHaveProperty('total');
    expect(body.data.meta).toHaveProperty('page');
    expect(body.data.meta).toHaveProperty('perPage');
  });
});
```

---

## Árbol de decisión

```
¿Necesito cambiar la API?
│
├── ¿El cambio es backward compatible? (campo nuevo opcional, bugfix)
│   └── → Aplicar directamente, sin nueva versión
│
├── ¿El cambio es breaking?
│   ├── ¿Hay clientes externos o la API es pública?
│   │   └── → Crear V2, deprecar V1 con Sunset header, período 90 días mínimo
│   │
│   └── ¿Solo la consume el propio frontend?
│       └── → Cambiar frontend y backend en el mismo PR, sin nueva versión
│
└── ¿No sé si hay clientes externos?
    └── → Revisar logs por user-agent y asumir que sí los hay
```

---

## Checklist antes de introducir un breaking change

- [ ] ¿Hay clientes externos documentados usando este endpoint?
- [ ] ¿Los logs muestran user-agents distintos al propio frontend?
- [ ] ¿La nueva versión está documentada en OpenAPI / Scalar?
- [ ] ¿Se configuraron los headers `Sunset` y `Deprecation` en V1?
- [ ] ¿Se comunicó la deprecación (email / changelog / docs)?
- [ ] ¿Hay tests de contrato para ambas versiones?
- [ ] ¿Hay fecha de sunset definida y en el calendario del equipo?

---

## Referencias

- [API Docs](/api-docs.md) — contract-first con Zod, generación de OpenAPI; los schemas se versionan siguiendo este doc
- [Semantic Versioning](/decisiones/semver.md) — versión mayor del app coincide con nueva versión de API pública
- [OWASP API](/owasp-api.md) — API9: Improper Inventory Management, mantener inventario de versiones activas
- [Testing](/testing.md) — tests de contrato por versión en Vitest
- [Logging](/logging.md) — loggear versión usada para detectar tráfico antes del sunset
