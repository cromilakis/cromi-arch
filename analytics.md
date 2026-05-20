# Analítica de Usuarios

> INVESTIGADO: PostHog self-hosted docs, privacy-first analytics patterns, event tracking best practices.

## 1. ¿Qué rastreamos?

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `page_view` | Vista | Cada navegación de página |
| `sign_up` | Conversión | Registro de nuevo usuario |
| `login` | Acción | Inicio de sesión |
| `pago_iniciado` | Conversión | Usuario entra al checkout |
| `pago_completado` | Conversión | Pago exitoso |
| `feature_usada` | Uso | Interacción con funcionalidad específica |

## 2. Enfoque privado (sin trackers externos)

No usamos Google Analytics ni trackers de terceros. Todo pasa por PostgreSQL + PostHog auto-hospedado (o Plausible).

```tsx
// src/lib/analytics.ts
type Evento = {
  nombre: string;
  usuarioId?: string;
  propiedades?: Record<string, unknown>;
  pagina?: string;
};

export async function trackEvent(evento: Evento) {
  // PostgreSQL
  await prisma.eventoAnalitica.create({
    data: {
      nombre: evento.nombre,
      usuarioId: evento.usuarioId,
      propiedades: evento.propiedades || {},
      pagina: evento.pagina || window.location.pathname,
      userAgent: navigator.userAgent,
    },
  });

  // PostHog (si está configurado)
  if (posthog) {
    posthog.capture(evento.nombre, evento.propiedades);
  }
}
```

## 3. Event tracking con TanStack Query middleware

```tsx
// src/lib/query-middleware.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      meta: {
        trackAnalytics: true,
      },
    },
  },
});

// Envoltorio para rastrear queries
export function useTrackedQuery(key: string, options: any) {
  return useQuery({
    queryKey: [key],
    ...options,
    onSuccess: (data: any) => {
      trackEvent({ nombre: `query_${key}_success` });
    },
    onError: (error: Error) => {
      trackEvent({ nombre: `query_${key}_error`, propiedades: { error: error.message } });
    },
  });
}
```

## 4. Dashboard de métricas clave

```prisma
model EventoAnalitica {
  id          String   @id @default(cuid())
  nombre      String
  usuarioId   String?
  pagina      String?
  propiedades Json?
  userAgent   String?
  creadoEn    DateTime @default(now())

  @@index([nombre, creadoEn])
  @@index([usuarioId])
}
```

Vistas SQL para dashboards:

```sql
-- Usuarios activos diarios (DAU)
SELECT DATE(creadoEn) as fecha, COUNT(DISTINCT usuarioId) as dau
FROM EventoAnalitica
WHERE nombre = 'page_view'
GROUP BY DATE(creadoEn)
ORDER BY fecha DESC;
```

## 5. Panel interno

El dashboard de analítica se sirve en `/admin/analytics` y muestra:

- DAU/MAU (usuarios activos)
- Tasa de conversión (registro → pago)
- Features más usadas
- Tiempo promedio por sesión
- Embudos de conversión (funnels)
