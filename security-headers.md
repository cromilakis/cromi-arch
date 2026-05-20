# Seguridad HTTP (CSP y Headers)

Headers de seguridad configurados en Next.js para proteger contra XSS, clickjacking, MIME sniffing y otros ataques.

## Configuración en `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self'
    https://api.stripe.com
    https://o*.ingest.sentry.io
    https://*.supabase.co;
  frame-src https://js.stripe.com https://hooks.stripe.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader.replace(/\s{2,}/g, ' ').trim() },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Cross-Origin isolation headers (opcional, evaluar impacto)
          // { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          // { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      // Stripe webhooks no necesitan CSP estricto
      {
        source: '/api/webhooks/stripe',
        headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'" }],
      },
    ];
  },
};

export default nextConfig;
```

## Headers explicados

### Content-Security-Policy (CSP)

Previene XSS controlando qué recursos puede cargar el navegador.

| Directiva                | Valor                        | Explicación                               |
|--------------------------|------------------------------|-------------------------------------------|
| `default-src`            | `'self'`                     | Origen por defecto para todo recurso      |
| `script-src`             | `'self'`, Stripe             | Solo scripts propios y Stripe             |
| `style-src`              | `'self'`, `'unsafe-inline'`  | Necesario para CSS-in-JS / Tailwind       |
| `img-src`                | `self`, `data:`, `https:`    | Imágenes desde cualquier HTTPS            |
| `frame-src`              | Stripe                       | Solo Stripe para 3D Secure/payment forms  |
| `frame-ancestors`        | `'none'`                     | Previene clickjacking (igual que XFO)     |
| `upgrade-insecure-requests` | -                         | Fuerza HTTPS automáticamente              |

### Strict-Transport-Security (HSTS)

Fuerza conexiones HTTPS por 2 años (`max-age=63072000`), incluyendo subdominios. Para `preload` se debe registrar el dominio en [hstspreload.org](https://hstspreload.org/).

### X-Content-Type-Options

`nosniff` evita que el navegador interprete archivos con un MIME type distinto al declarado.

### X-Frame-Options

`DENY` impide que la página se renderice dentro de un `<iframe>`, previniendo clickjacking.

### Referrer-Policy

`strict-origin-when-cross-origin` — envía la URL completa solo a orígenes seguros del mismo sitio; a otros orígenes solo el origen.

### Permissions-Policy

Deshabilita APIs sensibles del navegador que no usamos: cámara, micrófono, geolocalización.

### Cross-Origin-Resource-Policy

`same-origin` — evita que recursos de la app sean cargados desde sitios externos. Previene leakage de información sensible a través de inclusión cross-origin.

### Cross-Origin-Opener-Policy y Cross-Origin-Embedder-Policy (opcional)

Estos headers habilitan el aislamiento cross-origin (COOP + COEP = cross-origin isolation), lo que permite usar APIs como `SharedArrayBuffer`. También protegen contra ataques Spectre. Sin embargo, **requieren que todos los recursos cross-origin (CDN, imágenes, scripts) envíen explícitamente `Cross-Origin-Resource-Policy: cross-origin`**, lo que puede romper integraciones con servicios externos. Se dejan comentados por ahora, evaluar su activación progresiva.

## Cómo verificar

1. **SecurityHeaders.com** — <https://securityheaders.com> analiza headers públicos.
2. **CSP Evaluator** — <https://csp-evaluator.withgoogle.com> valida la política CSP.
3. **Local testing** — abrir DevTools > Network > Response Headers en cualquier request.

## Notas adicionales

- En desarrollo, el CSP se relaja automáticamente con Next.js (agrega `'unsafe-eval'` para HMR). En producción se aplica la política definida.
- Si usas next/image con dominios externos, agrégalos a `img-src`.
- Verifica periódicamente que los headers se sirvan correctamente con `curl -I https://tudominio.com`.
