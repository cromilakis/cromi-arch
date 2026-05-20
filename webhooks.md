# Manejo de Webhooks (Stripe)

## Endpoint de Stripe Webhook

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { buffer } from 'node:stream/consumers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await buffer(req.body!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Procesar evento
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
  }

  return Response.json({ received: true });
}
```

## Idempotencia

Prevenir procesamiento duplicado de eventos:

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const eventId = 'stripe_' + session.id;

  const existing = await prisma.processedEvent.findUnique({
    where: { eventId },
  });
  if (existing) return; // Ya procesado

  await prisma.$transaction(async (tx) => {
    await tx.processedEvent.create({ data: { eventId } });
    await tx.user.update({
      where: { stripeCustomerId: session.customer as string },
      data: { subscriptionStatus: 'active' },
    });
  });
}
```

```prisma
model ProcessedEvent {
  id        String   @id
  eventId   String   @unique
  createdAt DateTime @default(now())
}
```

## Verificación de Firma (Signature Verification)

Stripe envía el header `stripe-signature`. La verificación ocurre con `stripe.webhooks.constructEvent()`.

Para desarrollo local con Stripe CLI:

```bash
# Escuchar webhooks y reenviar al servidor local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# El CLI imprime el webhook secret: whsec_xxxxx
```

## Retry Logic para Webhooks Fallidos

Stripe reintenta automáticamente hasta 3 veces durante 3 días si no recibe un `2xx`. Para reintentos adicionales:

```typescript
async function processWebhookWithRetry(event: Stripe.Event, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await processEvent(event);
      return;
    } catch (error) {
      if (attempt === retries - 1) {
        await logFailedWebhook(event.id, error);
        throw error; // Stripe reintentará
      }
      await sleep(Math.pow(2, attempt) * 1000); // backoff exponencial
    }
  }
}
```

## Desarrollo Local con Stripe CLI

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Reenviar eventos a localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Disparar eventos de prueba
stripe trigger checkout.session.completed
```

## Monitoreo

- Sentry captura errores no manejados en webhooks.
- Pino para logging estructurado de cada evento recibido.
- Tabla `processed_event` para auditoría.
