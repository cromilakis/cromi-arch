# Estrategia de Documentación de API

## Enfoque: Contract-First con Zod

Usamos **Zod schemas** como fuente de verdad para la documentación. Cada endpoint exporta su schema de entrada y salida.

```typescript
// app/api/users/schema.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
});

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
});
```

## Formato de Respuesta Estandarizado

Todas las respuestas siguen una estructura única:

```typescript
// Éxito
{ "data": { "id": "abc-123", "name": "Juan" } }

// Error
{ "error": "Email already exists", "code": "DUPLICATE_EMAIL" }
```

Implementación en Next.js App Router:

```typescript
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateUserSchema.parse(body);
    const user = await createUser(parsed);
    return Response.json({ data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      }, { status: 400 });
    }
    return Response.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
```

## Herramientas de Documentación

| Herramienta | Uso | Pros |
|-------------|-----|------|
| **Scalar** | Docs interactivos (recomendado) | UI moderna, soporte nativo OpenAPI 3.1 |
| **Scalar API Reference** | Docs estáticos/embebidos | Sin dependencias externas, theming customizable |
| **Markdown manual** | `/docs/api/*.md` | Control total, sin setup |

Para generar OpenAPI 3.1 desde Zod, usar `@scalar/zod-openapi` (recomendado 2025):

```bash
npm install @scalar/zod-openapi zod-openapi
```

```typescript
// lib/openapi.ts
import { OpenAPIRegistry } from '@scalar/zod-openapi';
import { z } from 'zod';

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'post',
  path: '/api/users',
  summary: 'Create a new user',
  request: {
    body: {
      content: { 'application/json': { schema: CreateUserSchema } },
    },
  },
  responses: {
    201: {
      description: 'User created',
      content: { 'application/json': { schema: UserResponseSchema } },
    },
  },
});
```

## Cómo Consume el Frontend

1. El frontend lee los schemas compartidos desde un paquete `@repo/schemas`.
2. Los tipos se infieren automáticamente: `z.infer<typeof UserResponseSchema>`.
3. TanStack Query usa estos tipos para tipar peticiones y respuestas.

```typescript
// apps/web/hooks/useUsers.ts
import { CreateUserSchema } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';

export function useCreateUser() {
  return useMutation({
    mutationFn: (data: z.infer<typeof CreateUserSchema>) =>
      fetch('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  });
}
```
