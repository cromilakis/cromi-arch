# Analítica de Usuarios

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
  // PostgreSQL — pagina debe pasarse explícitamente (window no existe en servidor)
  await prisma.eventoAnalitica.create({
    data: {
      nombre: evento.nombre,
      usuarioId: evento.usuarioId,
      propiedades: evento.propiedades || {},
      pagina: evento.pagina,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
    },
  });

  // PostHog (si está configurado)
  if (posthog) {
    posthog.capture(evento.nombre, evento.propiedades);
  }
}
```

## 3. Event tracking con TanStack Query

En TanStack Query v5, `onSuccess` y `onError` se eliminaron de `useQuery` — se manejan en el componente con efectos:

```tsx
// Envoltorio para rastrear queries (TanStack Query v5)
import { useQuery, useEffect } from 'react';

export function useTrackedQuery(key: string, options: object) {
  const query = useQuery({ queryKey: [key], ...options });

  useEffect(() => {
    if (query.isSuccess) trackEvent({ nombre: `query_${key}_success` });
  }, [query.isSuccess, key]);

  useEffect(() => {
    if (query.isError && query.error instanceof Error) {
      trackEvent({ nombre: `query_${key}_error`, propiedades: { error: query.error.message } });
    }
  }, [query.isError, key, query.error]);

  return query;
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

## Referencias

- [Logging](/logging.md) — Pino para logs técnicos; analítica para métricas de negocio
- [Sentry](/sentry.md) — Sentry captura errores; analítica captura comportamiento de usuario
- [Feature Flags](/feature-flags.md) — combinar eventos analíticos con flags para medir adopción de features
- [Estrategia .env](/decisiones/env-strategy.md) — `POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`
