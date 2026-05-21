# Estrategia de Notificaciones

## 1. Notificaciones en la aplicación

### Toast
Notificaciones temporales para acciones rápidas (guardado exitoso, error leve).

```tsx
// Componente de ejemplo
import { toast } from '@/components/ui/toast';

toast.success('Cambios guardados correctamente');
toast.error('Error al procesar la solicitud');
```

### Banner
Avisos persistentes que requieren atención del usuario.

| Tipo | Duración | Uso |
|------|----------|-----|
| Toast | 4 segundos | Operaciones exitosas/fallos leves |
| Banner | Hasta cerrar | Errores críticos, mantenimiento |
| Modal | Hasta interactuar | Confirmaciones, acciones destructivas |

## 2. Notificaciones por Email

Usamos **Resend** + **React Email** para emails transaccionales.

```tsx
import { resend } from '@/lib/resend';
import BienvenidaEmail from '@/emails/bienvenida';

await resend.emails.send({
  from: 'App <no-reply@tudominio.com>',
  to: usuario.email,
  subject: 'Bienvenido a la plataforma',
  react: <BienvenidaEmail nombre={usuario.nombre} />,
});
```

Plantillas disponibles: `bienvenida`, `recuperar-contrasena`, `confirmacion-pago`, `reporte-semanal`.

## 3. Notificaciones Push

Implementar solo cuando sea necesario (usuarios recurrentes, dashboards).

```tsx
// Service Worker + Web Push API
if ('Notification' in window) {
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      // Registrar suscripción en la BD
    }
  });
}
```

## 4. Preferencias de Notificaciones

Cada usuario configura sus canales desde `/configuracion/notificaciones`.

```prisma
model PreferenciaNotificacion {
  id             String  @id @default(cuid())
  usuarioId      String
  tipoEvento     String  // "nuevo_comentario", "pago_recibido", etc.
  canalEmail     Boolean @default(true)
  canalInApp     Boolean @default(true)
  canalPush      Boolean @default(false)
  usuario        Usuario @relation(fields: [usuarioId], references: [id])
}
```

## 5. Rate Limiting de Notificaciones

Evitar saturar al usuario con notificaciones repetitivas.

| Canal | Límite | Ventana |
|-------|--------|---------|
| Email | 5 por hora | 1 hora |
| Push | 20 por hora | 1 hora |
| Toast | 1 cada 2s | Por sesión |

```tsx
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const emailNotifLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
});

const { success } = await emailNotifLimiter.limit(`notif:email:${usuarioId}`);
if (!success) return; // Saltar notificación
```

## Referencias

- [Decisión: Rate Limiting](/decisiones/rate-limiting.md) — patrón Upstash `Ratelimit.slidingWindow` y helper `rateLimitCheck`
- [Background Jobs](/background-jobs.md) — los jobs de email usan el mismo logger centralizado
- [Logging](/logging.md) — loggear envíos fallidos de email con Pino
- [Estrategia .env](/decisiones/env-strategy.md) — `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
