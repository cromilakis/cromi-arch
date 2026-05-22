# Email Templates con React Email + Resend

> Creación, preview y envío de emails transaccionales usando React Email y Resend.

## Configuración de Resend

```bash
npm install resend react-email @react-email/components
```

```ts
// lib/resend.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
// RESEND_API_KEY en .env.local
```

## Estructura de Templates

```
emails/
  components/       # Componentes reutilizables para emails
    header.tsx
    footer.tsx
    button.tsx
  welcome.tsx       # Bienvenida al registrarse
  reset-password.tsx# Restablecer contraseña
  notification.tsx  # Notificaciones push
  invoice.tsx       # Factura / recibo
```

## Componentes de Email Reutilizables

```tsx
// emails/components/button.tsx
import { Button } from '@react-email/components';

export function EmailButton({ href, children }) {
  return (
    <Button href={href} style={{ background: '#000', color: '#fff', padding: '12px 24px', borderRadius: 6 }}>
      {children}
    </Button>
  );
}
```

## Template: Welcome

```tsx
// emails/welcome.tsx
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components';
import { EmailButton } from './components/button';

interface WelcomeEmailProps {
  userName: string;
  confirmLink: string;
}

export default function WelcomeEmail({ userName, confirmLink }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>¡Bienvenido, {userName}!</Heading>
          <Text>Gracias por registrarte. Confirma tu cuenta para empezar.</Text>
          <EmailButton href={confirmLink}>Confirmar Cuenta</EmailButton>
        </Container>
      </Body>
    </Html>
  );
}
```

## Preview Local con react-email

```bash
npx react-email@latest start
# Abre http://localhost:3001 con preview visual de todos los templates
```

## Envío desde Server Actions

```ts
'use server';
import { resend } from '@/lib/resend';
import WelcomeEmail from '@/emails/welcome';

export async function sendWelcomeEmail(userName: string, email: string) {
  const { data, error } = await resend.emails.send({
    from: 'Acme <noreply@tu-dominio.com>',
    to: email,
    subject: '¡Bienvenido a Acme!',
    react: WelcomeEmail({ userName, confirmLink: 'https://...' }),
  });

  if (error) throw new Error(error.message);
  return data;
}
```

## Tracking de Entregas

Resend expone eventos vía webhooks:

```ts
// app/api/webhooks/resend/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  // payload.type: 'email.delivered' | 'email.bounced' | 'email.opened'
  await db.emailLog.update({
    where: { resendId: payload.data.email_id },
    data: { status: payload.type.replace('email.', '') },
  });
  return new Response(null, { status: 200 });
}
```

| Evento | Descripción |
|--------|-------------|
| `email.sent` | Email enviado exitosamente |
| `email.delivered` | Entregado en bandeja de entrada |
| `email.opened` | Usuario abrió el email |
| `email.bounced` | Rebote (email inválido) |
| `email.complained` | Reportado como spam |
