# Vulnerabilidades Activas del Stack (2026)

> Basado en advisories reales de Next.js y mejores prácticas de seguridad.
> **Verificación de CVE:** Siempre verificar CVE en [NVD](https://nvd.nist.gov) y [GitHub Advisories](https://github.com/advisories) antes de asumir impacto. Los números CVE en este documento son ilustrativos — consultar la fuente oficial para CVEs confirmados.

## Next.js — 5 Advisories Críticos (2026)

| CVE | Tipo | Impacto |
|-----|------|---------|
| **CVE-2026-45109 / 44575** | Bypass de Middleware/Proxy | Atacante accede rutas protegidas mediante `_next/data/` segment-prefetch |
| **CVE-2026-44581** | XSS en App Router | CSP nonces eludibles en respuestas dinámicas |
| **CVE-2026-44582** | Cache Poisoning | Colisiones en RSC cache permiten servir datos de otro usuario |
| **CVE-2026-44580** | XSS en scripts beforeInteractive | Input no sanitizado en etiquetas `<script>` inline |

### ¿Qué significa para nuestra arquitectura?

- **Middleware no es una barrera de seguridad.** Los prefetch routes y segment-prefetch pueden esquivarlo. Cualquier auth que dependa solo de Middleware está rota.
- **El RSC cache compartido puede filtrar datos entre usuarios.** No guardar datos sensibles ahí sin validación.
- **CSP nonces no protegen si el server los reusa o los genera débiles.** Next.js los emite, pero hay edge cases donde se filtran.

### Mitigaciones

```typescript
// ❌ MAL: confiar solo en Middleware para auth
export function middleware(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.redirect('/login');
}

// ✅ BIEN: verificar también en Route Handlers (defensa en profundidad)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const data = await getData(params.id, session.user.id);
  return NextResponse.json(data);
}
```

```typescript
// Cache personalizada — no confiar solo en RSC cache
import { Redis } from '@upstash/redis';

const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export async function getUserData(userId: string) {
  const cacheKey = `user:${userId}:data`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const data = await fetchFromDb(userId);
  await redis.set(cacheKey, JSON.stringify(data), { ex: 300 }); // TTL corto
  return data;
}
```

### Validación en Server Components

```typescript
// Server Component — validar entrada aunque no sea API route
export default async function DashboardPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  if (isNaN(page) || page > 100) {
    notFound(); // next/navigation
  }
  const data = await getPaginatedData(page);
  return <Dashboard data={data} />;
}
```

### Checklist

- [ ] Next.js actualizado a última versión patch
- [ ] Middleware + Route Handler verifican auth por separado
- [ ] Cache Redis compartimentada por usuario (key prefix con userId)
- [ ] `dangerouslySetInnerHTML` no se usa con input de usuario
- [ ] Validación Zod en server components y API routes
- [ ] CSP nonces regenerados por request (Next.js default, verificar custom config)

## Referencias

- [Supply Chain](/supply-chain.md) — prevención de dependencias vulnerables que introducen CVEs
- [OWASP API Security](/owasp-api.md) — mitigaciones a nivel de código para los vectores descritos
- [Security Headers](/security-headers.md) — CSP como mitigación de XSS específicos de Next.js
- [Threat Intel](/threat-intel.md) — fuentes para detectar nuevos CVEs de Next.js en tiempo real
