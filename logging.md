# Logging Estructurado con Pino

Usamos **Pino** como logger principal por ser el más rápido del ecosistema Node.js y producir JSON estructurado nativo.

## Niveles de log y cuándo usarlos

| Nivel   | Uso |
|---------|-----|
| `fatal` | El servidor no puede continuar (ej. DB sin conexión en startup) |
| `error` | Error manejado que degrada funcionalidad (ej. fallo en pago, excepción en API) |
| `warn`  | Situación anómala no crítica (ej. rate limit cercano, deprecación) |
| `info`  | Eventos importantes del negocio (login, registro, pago completado) |
| `debug` | Información útil solo en desarrollo (ej. datos de request, timings) |

## Qué loggear SIEMPRE

- **Autenticación:** login exitoso, login fallido, registro, cierre de sesión
- **Pagos:** creación de checkout, éxito, fallo, reembolso
- **Errores HTTP:** cualquier 4xx (con `userId` si existe) y 5xx (con stack trace)
- **Operaciones críticas:** cambios de rol, eliminación de cuenta, webhooks entrantes

## Qué NO loggear

Nunca incluyas en los logs:

- Contraseñas (ni hasheadas)
- Tokens JWT o API keys
- PII innecesaria (email completo, dirección, teléfono)
- Números de tarjeta de crédito

### Redacción automática de campos sensibles

El logger centralizado (`src/lib/logger.ts`) aplica `redact` automáticamente para los campos listados. Ver la sección **Logger centralizado** más abajo para la implementación completa.

## Correlation IDs

Cada request lleva un `requestId` único para trazar errores a través de servicios.

**Middleware automático** (Next.js):

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'

export function middleware(request: NextRequest) {
  const requestId = randomUUID()
  const response = NextResponse.next()
  response.headers.set('X-Request-ID', requestId)
  return response
}

export const config = {
  matcher: '/api/:path*',
}
```

**Logger por request:**

```typescript
import { randomUUID } from 'node:crypto';
import { logger } from '@/lib/logger';

export function createRequestLogger() {
  const requestId = randomUUID();
  return {
    requestId,
    info: (msg: string, data?: object) =>
      logger.info({ requestId, ...data }, msg),
    error: (msg: string, err?: Error, data?: object) =>
      logger.error({ requestId, err: err?.message, stack: err?.stack, ...data }, msg),
    warn: (msg: string, data?: object) =>
      logger.warn({ requestId, ...data }, msg),
  };
}
```

En el middleware de Next.js o API Route, envuelve cada handler:

```typescript
import { createRequestLogger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const log = createRequestLogger();
  log.info('Fetching invoices', { userId: session.user.id });
  // ...
}
```

## Formato de salida

Cada línea es JSON válido, ideal para ingestión en sistemas como Datadog, Grafana Loki o ELK:

```json
{"level":"info","time":1712345678901,"requestId":"abc-123","msg":"Login successful","userId":"usr_xxx"}
{"level":"error","time":1712345678902,"requestId":"abc-123","err":"Payment failed","stripeId":"pi_xxx","msg":"Checkout error"}
```

## Logger centralizado

Archivo `src/lib/logger.ts` — importa desde cualquier lugar. Combina todo: redact, formatters, pino-pretty en desarrollo:

```typescript
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  redact: {
    paths: [
      'password', 'passwordHash', 'token', 'secret',
      'authorization', 'cookie', 'creditCard', 'ssn',
      'email', 'phone', 'headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),  // omitir pid/hostname en producción (Vercel los expone en otro nivel)
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

Agregar `LOG_LEVEL` a `.env.example`:

```
# Logging
LOG_LEVEL=info   # fatal | error | warn | info | debug
```

Ver [Estrategia .env](/decisiones/env-strategy.md) para gestión de variables por entorno.

## Referencias

- [Sentry](/sentry.md) — diferencia clave: Pino registra el flujo de la aplicación, Sentry captura errores inesperados
- [Auditoría](/auditoria.md) — diferencia: Pino es log técnico, audit log es trazabilidad de negocio
- [Error Handling](/error-handling.md) — los errores 5xx deben loggearse Y enviarse a Sentry
- [Background Jobs](/background-jobs.md) — los jobs usan el mismo logger centralizado para registrar ejecución
- [Estrategia .env](/decisiones/env-strategy.md) — `LOG_LEVEL` para controlar verbosidad por entorno
