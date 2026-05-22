# Real-time: Polling, SSE y WebSockets

## Cuándo usar qué

| Patrón | Latencia | Dirección | Vercel | Cuándo |
|--------|----------|-----------|--------|--------|
| **Polling** | ~5–30 s | Cliente → Servidor | ✅ Nativo | Contadores, estado que cambia cada varios segundos |
| **SSE** | ~1 s | Servidor → Cliente | ⚠️ Limitado por timeout | Feeds en vivo, progreso de tareas, notificaciones |
| **WebSockets** | <100 ms | Bidireccional | ❌ No soportado nativo | Chat, colaboración en tiempo real, multiplayer |

La regla general: **empezar con polling**, escalar a SSE cuando el polling sea demasiado frecuente, y WebSockets solo cuando se necesita bidireccionalidad real.

---

## Opción 1 — Polling con TanStack Query

La solución más simple. No requiere infraestructura adicional.

```typescript
// hooks/useNotifications.ts
import { useQuery } from '@tanstack/react-query';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then(r => r.json()),
    refetchInterval: 15_000,        // re-consulta cada 15 segundos
    refetchIntervalInBackground: false, // pausa si la pestaña no está activa
  });
}
```

**Cuándo es suficiente:** notificaciones, dashboards de métricas, estado de pedidos. Para la mayoría de apps, polling a 15–30 s tiene latencia aceptable y cero complejidad operacional.

**Cuándo no escala:** si el usuario necesita ver cambios en menos de 5 segundos o si tienes miles de usuarios haciendo polling simultáneo, SSE es más eficiente.

---

## Opción 2 — Server-Sent Events (SSE)

Conexión persistente unidireccional (servidor envía eventos al cliente). Funciona con Next.js Route Handlers y el estándar `EventSource` del browser.

### Constraint de Vercel

| Plan Vercel | Timeout función | Impacto en SSE |
|-------------|-----------------|----------------|
| Hobby | 10 s | SSE cortada a los 10 s — no usar |
| Pro | 60 s | Funcional para SSE de vida corta |
| Pro + `maxDuration` | Hasta 800 s | Funcional para SSE de larga duración |

Para SSE viable en producción, se necesita **Vercel Pro** con `maxDuration` configurado:

```typescript
// app/api/events/route.ts
export const maxDuration = 300; // 5 minutos máximo por conexión
export const dynamic = 'force-dynamic';
```

### Implementación básica

```typescript
// app/api/events/route.ts
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Función para enviar un evento
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Heartbeat cada 30 s para mantener conexión viva
      const heartbeat = setInterval(() => {
        sendEvent('ping', { ts: Date.now() });
      }, 30_000);

      // Escuchar eventos de Redis Pub/Sub para este usuario
      const channel = `user:${session.user.id}:events`;
      subscribeToChannel(channel, (message) => {
        sendEvent(message.type, message.data);
      });

      // Limpieza al cerrar la conexión
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribeFromChannel(channel);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // deshabilitar buffering en proxies
    },
  });
}
```

### Cliente con reconexión automática

```typescript
// hooks/useServerEvents.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useServerEvents() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource('/api/events');
      esRef.current = es;

      es.addEventListener('notification', (e) => {
        const data = JSON.parse(e.data);
        // Invalidar queries afectadas para que se recarguen
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        // O actualizar el caché directamente para UX inmediata
        queryClient.setQueryData(['notifications'], (old: Notification[]) => [
          data,
          ...(old ?? []),
        ]);
      });

      es.addEventListener('order_updated', (e) => {
        const data = JSON.parse(e.data);
        queryClient.invalidateQueries({ queryKey: ['orders', data.orderId] });
      });

      es.onerror = () => {
        es.close();
        // Reconectar después de 5 s con backoff
        setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
    };
  }, [queryClient]);
}
```

### Redis Pub/Sub para múltiples instancias

El problema: en Vercel hay múltiples instancias serverless. Un evento generado en la instancia A (ej: webhook de Stripe) necesita llegar a la instancia B donde está la conexión SSE del usuario.

**Solución:** Redis Pub/Sub como bus de mensajes entre instancias.

```typescript
// lib/realtime/pubsub.ts
import { Redis } from '@upstash/redis';

const publisher = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Publicar evento (desde cualquier route handler)
export async function publishEvent(userId: string, type: string, data: unknown) {
  await publisher.publish(`user:${userId}:events`, JSON.stringify({ type, data }));
}

// Ejemplo: notificar al usuario cuando su pago se procesa
// app/api/webhooks/stripe/route.ts
await publishEvent(userId, 'payment_success', {
  amount: session.amount_total,
  currency: session.currency,
});
```

> **Nota:** Upstash Redis REST API no soporta subscripción persistente (subscribe) porque es stateless. Para SSE con Pub/Sub real necesitas Upstash Redis con conexión TCP persistente, o usar polling de Redis como fallback: el SSE handler hace `LPOP` en una lista de eventos del usuario cada segundo.

**Patrón alternativo — Redis como cola de eventos por usuario:**

```typescript
// Publicar (sin estado, funciona con REST)
await redis.lpush(`events:${userId}`, JSON.stringify({ type, data, ts: Date.now() }));
await redis.expire(`events:${userId}`, 300); // TTL 5 min

// Consumir en el SSE handler (polling interno)
const poll = setInterval(async () => {
  const events = await redis.lrange(`events:${userId}`, 0, -1);
  await redis.del(`events:${userId}`);
  for (const raw of events) {
    const event = JSON.parse(raw as string);
    sendEvent(event.type, event.data);
  }
}, 1_000); // cada 1 segundo
```

---

## Opción 3 — WebSockets (con servicio externo)

Vercel no soporta WebSockets nativos en funciones serverless. Para chat, colaboración o multiplayer se necesita un servicio especializado.

### Ably (recomendado — tier generoso)

```bash
npm install ably
```

```typescript
// lib/realtime/ably.ts
import Ably from 'ably';

// Servidor: publicar mensajes
const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function publishToChannel(channel: string, event: string, data: unknown) {
  const ch = ably.channels.get(channel);
  await ch.publish(event, data);
}

// app/api/ably-token/route.ts — generar token para el cliente
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const realtime = new Ably.Rest(process.env.ABLY_API_KEY!);
  const tokenRequest = await realtime.auth.createTokenRequest({
    clientId: session.user.id,
  });
  return Response.json({ data: tokenRequest });
}
```

```typescript
// hooks/useAbly.ts — cliente
import Ably from 'ably';
import { useEffect, useRef } from 'react';

export function useAblyChannel(channelName: string, onMessage: (msg: Ably.Message) => void) {
  const clientRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    const client = new Ably.Realtime({
      authUrl: '/api/ably-token',
      authMethod: 'POST',
    });
    clientRef.current = client;

    const channel = client.channels.get(channelName);
    channel.subscribe(onMessage);

    return () => {
      channel.unsubscribe();
      client.close();
    };
  }, [channelName]);
}
```

### Cuándo usar Ably vs SSE

| Necesidad | Solución |
|-----------|----------|
| Usuario recibe notificaciones | SSE |
| Usuario ve feed de actividad | SSE |
| Progreso de tarea larga | SSE |
| Chat entre usuarios | Ably / WebSocket |
| Edición colaborativa | Ably / PartyKit |
| Cursor compartido, pizarrón | Ably / PartyKit |
| Juego multijugador | Ably / PartyKit |

---

## Variables de entorno

```env
# Solo necesario si se usa Ably
ABLY_API_KEY=
NEXT_PUBLIC_ABLY_API_KEY=   # NUNCA poner la clave privada con NEXT_PUBLIC_
```

Agregar a `.env.example` solo si el proyecto usa WebSockets.

---

## Árbol de decisión

```
¿Qué latencia necesita el usuario?
│
├── > 5 segundos es aceptable
│   └── → Polling con TanStack Query (refetchInterval)
│
├── 1–5 segundos, servidor envía al cliente
│   ├── Vercel Pro → SSE con maxDuration
│   └── Vercel Hobby → Polling agresivo (3–5 s) o migrar a Pro
│
└── < 1 segundo o necesita bidireccionalidad
    └── → Ably / Pusher / PartyKit (WebSockets externos)
```

---

## Referencias

- [Cache](/cache.md) — `refetchInterval` de TanStack Query como polling de bajo esfuerzo
- [Notificaciones](/notificaciones.md) — SSE como canal de entrega de notificaciones in-app
- [Background Jobs](/background-jobs.md) — los jobs publican eventos que SSE distribuye
- [Costos](/costos.md) — Ably free tier: 200 conexiones simultáneas, 6M mensajes/mes
- [Estrategia .env](/decisiones/env-strategy.md) — `ABLY_API_KEY` nunca con prefijo `NEXT_PUBLIC_`
