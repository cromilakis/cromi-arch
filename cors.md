# Política CORS

## 1. ¿Cuándo se necesita CORS?

CORS se necesita cuando un frontend en un dominio diferente intenta acceder a nuestra API.

| Origen de la petición | ¿CORS necesario? |
|----------------------|------------------|
| Mismo dominio (tudominio.com) | No |
| Subdominio (app.tudominio.com) | Depende de cookies |
| Dominio externo (otro.com) | Sí |
| Aplicación móvil / scripts server-side | No |

## 2. Middleware Next.js para CORS

```tsx
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ORIGENES_PERMITIDOS = [
  'https://tudominio.com',
  'https://app.tudominio.com',
  'http://localhost:3000',
];

export function middleware(request: NextRequest) {
  const origen = request.headers.get('origin') || '';
  const respuesta = NextResponse.next();

  if (ORIGENES_PERMITIDOS.includes(origen)) {
    respuesta.headers.set('Access-Control-Allow-Origin', origen);
    respuesta.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    respuesta.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    respuesta.headers.set('Access-Control-Allow-Credentials', 'true');
    // Cache preflight por 2 horas (reducir número de OPTIONS requests)
    respuesta.headers.set('Access-Control-Max-Age', '7200');
  }

  // Siempre incluir Vary: Origin para caching correcto
  respuesta.headers.append('Vary', 'Origin');

  return respuesta;
}

export const config = {
  matcher: '/api/:path*',
};
```

## 3. Lista blanca de orígenes

```tsx
// src/config/cors.ts
const ORIGENES_PRODUCCION = [
  'https://tudominio.com',
  'https://admin.tudominio.com',
];

const ORIGENES_DESARROLLO = [
  'http://localhost:3000',
  'http://localhost:3001',
];

export const ORIGENES_PERMITIDOS =
  process.env.VERCEL_ENV === 'production'
    ? ORIGENES_PRODUCCION
    : [...ORIGENES_PRODUCCION, ...ORIGENES_DESARROLLO];
```

## 4. Manejo de Preflight (OPTIONS)

Next.js maneja automáticamente las peticiones OPTIONS con el middleware. Sin embargo, para rutas API específicas:

```tsx
// src/app/api/webhooks/stripe/route.ts
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Allow': 'POST',
    },
  });
}
```

## 5. Configuración producción vs desarrollo

| Configuración | Producción | Desarrollo |
|--------------|------------|------------|
| Orígenes permitidos | Solo dominios reales | Incluye localhost |
| Credenciales | Solo HTTPS | HTTP permitido |
| Max Age | 86400s (24h) | 600s (10min) |
| Métodos | GET, POST, PUT, DELETE | Todos |

Para debugging: revisar las cabeceras en la pestaña Network del navegador.

## 6. Consideraciones de Seguridad

### CORS no protege contra CSRF
CORS controla qué orígenes pueden leer respuestas, pero **no previene que se envíen solicitudes**. Una solicitud POST maliciosa desde `sitio-malicioso.com` a tu API igual se envía — el navegador simplemente no puede leer la respuesta. Para proteger contra CSRF:
- Usar tokens CSRF o el header `SameSite` en cookies
- Validar el header `Origin` o `Referer` en el servidor
- Auth.js v5 maneja CSRF automáticamente via `SameSite=Lax` y tokens

### No usar `Access-Control-Allow-Origin: *` con credenciales
Si `credentials: 'include'` está habilitado (como en nuestro caso con cookies de sesión), el estándar CORS **prohíbe** el uso de `*` como origen. Debes especificar orígenes explícitos.

### Vary: Origin
Siempre incluir el header `Vary: Origin` en respuestas CORS para que proxies y CDNs no sirvan respuestas cacheadas al origen incorrecto. Ya está configurado en el middleware arriba.
