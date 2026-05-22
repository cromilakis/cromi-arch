# OWASP API Security Top 10 — Mapeo a Nuestro Stack

## API1: Broken Object Level Authorization (BOLA)

Cada endpoint debe verificar ownership del recurso.

```typescript
// ❌ MAL: cualquiera puede ver el perfil de otro usuario
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  return NextResponse.json(user);
}

// ✅ BIEN: verificar que userId === resource.userId
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice || invoice.userId !== session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  return NextResponse.json(invoice);
}
```

## API2: Broken Authentication

Auth.js con sesión corta y refresh tokens rotativos.

```typescript
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 15 * 60 }, // 15 min
  jwt: { maxAge: 7 * 24 * 60 * 60 },              // 7 días para refresh
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.refreshToken = crypto.randomUUID(); }
      return token;
    },
    async session({ session, token }) {
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
};
```

## API3: Broken Object Property Level Authorization

Usar selects explícitos de Prisma. Nunca `{ include: { all: true } }`.

```typescript
// ✅ BIEN: solo devolver campos permitidos
const userPublic = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, name: true, avatar: true, createdAt: true },
});

// ❌ MAL: expone email hash, passwordHash, refreshToken...
const userAll = await prisma.user.findUnique({
  where: { id: userId },
  include: { all: true },
});
```

## API4: Unrestricted Resource Consumption

Rate limiting en CADA endpoint + paginación obligatoria.

```typescript
import { rateLimitCheck, apiLimiter } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const limited = await rateLimitCheck(ip, apiLimiter);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  const data = await prisma.item.findMany({ skip: (page - 1) * limit, take: limit });
  return NextResponse.json({ data, page, limit });
}
```

## API5: Broken Function Level Authorization

RBAC verificado en cada handler, no solo en middleware.

```typescript
const ADMIN_ROLES = ['admin', 'superadmin'];

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!ADMIN_ROLES.includes(session?.user?.role ?? '')) {
    return Response.json({ error: 'Se requiere rol admin' }, { status: 403 });
  }
  await prisma.item.delete({ where: { id: params.id } });
  return Response.json({ success: true });
}
```

## API6: Unrestricted Access to Sensitive Business Flows

**Protege flujos de negocio sensibles** (votaciones, reviews, transfers) contra automatización y abuso.

```typescript
// src/middleware/rate-limit-sensitive.ts
export async function validateBusinessFlow(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
  }

  // Rate limit por usuario para acciones sensibles
  const identifier = `flow:${session.user.id}:${req.nextUrl.pathname}`;
  const { success } = await rateLimiter.limit(identifier, { limit: 3, window: '1 h' });
  if (!success) {
    return NextResponse.json({
      error: 'Demasiadas solicitudes para esta acción. Intenta más tarde.',
      code: 'BUSINESS_FLOW_LIMITED',
    }, { status: 429 });
  }

  // Validación de reputación del usuario (anti-bot)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, accountAge: true, flags: true },
  });

  if (user?.flags?.includes('suspicious')) {
    return NextResponse.json({ error: 'Acción bloqueada por seguridad' }, { status: 403 });
  }

  // Captcha: agregar umbral basado en historial del usuario si se requiere
}
```

**Estrategias de mitigación:**
- Rate limiting agresivo por usuario para endpoints de flujo sensible
- Validación de reputación de cuenta (antigüedad, email verificado, historial)
- Captcha progresivo después de N intentos
- Monitoreo de patrones anómalos (múltiples acciones en segundos)
- Límites diarios por usuario para acciones como "forgot password", "transfer funds"

## API7: Server Side Request Forgery (SSRF)

Validar URLs de entrada, no permitir redirects a internal networks.

```typescript
import { URL } from 'node:url';

const ALLOWED_DOMAINS = ['api.safe.com', 'data.trusted.io'];
const BLOCKED_IPS = ['127.0.0.1', '::1', '10.', '172.16.', '192.168.'];

export async function fetchExternal(urlStr: string) {
  const url = new URL(urlStr);
  if (!ALLOWED_DOMAINS.includes(url.hostname)) throw new Error('Dominio no permitido');
  if (BLOCKED_IPS.some(prefix => url.hostname.startsWith(prefix))) throw new Error('IP interna');
  return fetch(url.toString(), { redirect: 'manual' }); // no seguir redirects
}
```

## API8: Security Misconfiguration

Headers de seguridad completos (CSP, HSTS, X-Frame-Options, etc.) en [Security Headers](/security-headers.md).

Reglas adicionales:
- `NEXT_PUBLIC_` solo para variables que el cliente necesita leer — nunca para secretos
- `npm audit --audit-level=high` en CI (ver [Supply Chain](/supply-chain.md))
- Nunca dejar `experimental.isrFlushToDisk: true` en producción

## API9: Improper Inventory Management

Versionar APIs explícitamente (`/api/v1/...`), retirar versiones antiguas.

## API10: Unsafe Consumption of APIs

Validar respuestas de APIs externas con Zod antes de usarlas.

```typescript
import { z } from 'zod';

const ExternalUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().max(100),
});

const raw = await fetch('https://api.external.com/user').then(r => r.json());
const safe = ExternalUserSchema.parse(raw); // lanza si no cumple esquema
```

---

## Ejemplo: Handler Seguro (BOLA + API3 + API5)

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimitCheck, apiLimiter } from '@/lib/rate-limit';
import { z } from 'zod';

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(5000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // API4: Rate limit
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const limited = await rateLimitCheck(ip, apiLimiter);
  if (limited) return limited;

  // API2: Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No auth' }, { status: 401 });

  // API1: BOLA — verificar ownership
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: { userId: true, user: { select: { role: true } } },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // API5: RBAC — dueño o admin puede editar
  const isOwner = post.userId === session.user.id;
  const isAdmin = ['admin', 'superadmin'].includes(post.user?.role ?? '');
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // API3: validar body contra schema explícito
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // API3: select explícito al devolver
  const updated = await prisma.post.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, title: true, content: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}
```

## Referencias

- [Rate Limiting](/decisiones/rate-limiting.md) — API4: implementación completa con Upstash
- [Security Headers](/security-headers.md) — API8: configuración completa de CSP y headers
- [Sesiones](/sesiones.md) — API2: estrategia JWT vs Database Sessions
- [Auditoría](/auditoria.md) — trazabilidad de operaciones sensibles (API5, API6)
- [Error Handling](/error-handling.md) — manejo uniforme de errores en los handlers seguros
```
