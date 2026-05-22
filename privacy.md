# Privacidad y Compliance (GDPR / CCPA)

Guía de implementación técnica de los derechos del usuario exigidos por GDPR (UE) y CCPA (California). No reemplaza asesoría legal — define los mecanismos técnicos mínimos.

---

## Mapa de derechos y endpoints

| Derecho | Norma | Plazo legal | Endpoint |
|---------|-------|-------------|----------|
| Acceso a mis datos | GDPR Art. 15 / CCPA | 30 días | `GET /api/privacy/export` |
| Portabilidad (export) | GDPR Art. 20 | 30 días | `GET /api/privacy/export` |
| Rectificación | GDPR Art. 16 | 30 días | `PATCH /api/user/profile` |
| Borrado ("derecho al olvido") | GDPR Art. 17 | 30 días | `DELETE /api/privacy/erase` |
| Retirar consentimiento | GDPR Art. 7 | Inmediato | `POST /api/privacy/consent` |
| Oponerse al tratamiento | GDPR Art. 21 | 30 días | Formulario → soporte |

---

## 1. Borrado de cuenta (GDPR Art. 17)

### La tensión con soft-delete

`soft-delete.md` usa `deletedAt` para borrado lógico — los datos siguen en la BD. El GDPR exige eliminar datos personales identificables cuando el usuario lo solicita. La solución es **anonimizar en lugar de borrar**, preservando la integridad referencial y los registros de auditoría sin retener PII.

### Modelo de anonimización

```prisma
// El campo `anonymizedAt` distingue una cuenta borrada (soft delete)
// de una cuenta anonimizada por solicitud GDPR
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  avatarUrl     String?
  deletedAt     DateTime?           // Soft delete normal
  anonymizedAt  DateTime?           // Borrado GDPR — PII eliminada
  // ...
}
```

### Flujo de borrado GDPR

```typescript
// app/api/privacy/erase/route.ts
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    // 1. Anonimizar datos del usuario — reemplazar PII con placeholders
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@anonymized.invalid`,
        name: 'Usuario eliminado',
        avatarUrl: null,
        deletedAt: new Date(),
        anonymizedAt: new Date(),
        // Nullear campos opcionales con PII
        phone: null,
        address: null,
        birthdate: null,
      },
    });

    // 2. Eliminar o anonimizar datos relacionados con PII
    await tx.userProfile.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });     // cerrar todas las sesiones
    await tx.account.deleteMany({ where: { userId } });     // desconectar OAuth

    // 3. Anonimizar audit logs (no borrar — son registros de negocio)
    await tx.auditLog.updateMany({
      where: { userId },
      data: {
        userEmail: `deleted-${userId}@anonymized.invalid`,
        userId: `anonymized-${userId}`, // mantener traza sin PII real
      },
    });

    // 4. Registrar la solicitud de borrado (el audit log de este evento usa ID anonimizado)
    await tx.auditLog.create({
      data: {
        userId: `anonymized-${userId}`,
        action: 'GDPR_ERASURE',
        entity: 'User',
        entityId: userId,
        description: 'Cuenta anonimizada por solicitud GDPR Art. 17',
        metadata: { requestedAt: new Date().toISOString() },
      },
    });
  });

  // Invalidar sesión activa
  await signOut({ redirect: false });

  return Response.json({ data: { message: 'Cuenta eliminada correctamente.' } });
}
```

### Datos que NO se borran

| Tipo | Motivo legal | Acción |
|------|--------------|--------|
| Registros financieros | Ley fiscal (5–10 años) | Anonimizar PII, conservar monto/fecha |
| Logs de fraude | Interés legítimo | Conservar 1 año con PII mínima |
| Audit de seguridad | Defensa legal | Conservar 1 año, anonimizar a los 30 días |

---

## 2. Exportación de datos (GDPR Art. 20)

```typescript
// app/api/privacy/export/route.ts
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit: máximo 1 exportación por hora para evitar abuse
  const { success } = await exportLimiter.limit(session.user.id);
  if (!success) {
    return Response.json(
      { error: 'Solo se permite una exportación por hora.' },
      { status: 429 }
    );
  }

  const userId = session.user.id;

  const [user, orders, auditLogs, preferences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
    }),
    prisma.order.findMany({
      where: { userId },
      select: { id: true, total: true, status: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      select: { action: true, entity: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.preferenciaNotificacion.findMany({ where: { usuarioId: userId } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    format: 'GDPR Data Export v1.0',
    user,
    orders,
    activityLog: auditLogs,
    notificationPreferences: preferences,
  };

  // Registrar la exportación en audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'EXPORT',
      entity: 'User',
      entityId: userId,
      description: 'Exportación de datos personales solicitada por el usuario (GDPR Art. 20)',
    },
  });

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mis-datos-${userId}.json"`,
    },
  });
}
```

---

## 3. Consentimiento y cookies

### Qué necesita consentimiento explícito

| Cookie / Tracker | ¿Requiere consentimiento? | Base legal |
|------------------|--------------------------|------------|
| Sesión de autenticación | ❌ No | Necesaria para el servicio |
| CSRF token | ❌ No | Necesaria para el servicio |
| Analytics (Plausible, Fathom) | ❌ No | Sin PII, sin fingerprinting |
| Analytics (Google Analytics) | ✅ Sí | Requiere consentimiento |
| Píxel de Stripe | ❌ No | Interés legítimo (fraude) |
| Marketing / retargeting | ✅ Sí | Requiere consentimiento |

**Recomendación:** usar **Plausible** o **Fathom** en lugar de Google Analytics. Son privacy-first, sin cookies y sin consentimiento requerido en la mayoría de jurisdicciones europeas.

### Modelo de consentimiento en BD

```prisma
model ConsentRecord {
  id          String   @id @default(cuid())
  userId      String?                    // null = usuario anónimo
  sessionId   String?                    // para anónimos
  version     String                     // "2025-01", versionado de la política
  analytics   Boolean  @default(false)
  marketing   Boolean  @default(false)
  ipHash      String?                    // hash de IP, no la IP real
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([sessionId])
}
```

```typescript
// app/api/privacy/consent/route.ts
const ConsentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json();
  const parsed = ConsentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid data' }, { status: 400 });

  const ip = req.headers.get('x-forwarded-for') ?? '';
  const ipHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
    .then(buf => Buffer.from(buf).toString('hex'));

  await prisma.consentRecord.create({
    data: {
      userId: session?.user?.id ?? null,
      version: process.env.PRIVACY_POLICY_VERSION ?? '2025-01',
      analytics: parsed.data.analytics,
      marketing: parsed.data.marketing,
      ipHash,
      userAgent: req.headers.get('user-agent') ?? null,
    },
  });

  return Response.json({ data: { recorded: true } });
}
```

### Banner de cookies (componente)

```tsx
// components/CookieBanner.tsx
'use client';

import { useState, useEffect } from 'react';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem('cookie-consent');
    if (!consented) setVisible(true);
  }, []);

  const handleAccept = async (analytics: boolean, marketing: boolean) => {
    await fetch('/api/privacy/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analytics, marketing }),
    });
    localStorage.setItem('cookie-consent', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div role="dialog" aria-label="Preferencias de cookies">
      <p>Usamos cookies técnicas necesarias para el funcionamiento del sitio.</p>
      <button onClick={() => handleAccept(false, false)}>Solo necesarias</button>
      <button onClick={() => handleAccept(true, false)}>Aceptar analytics</button>
      <a href="/privacy-policy">Política de privacidad</a>
    </div>
  );
}
```

---

## 4. Minimización de datos

Recoger solo los datos necesarios para el servicio (GDPR Art. 5.1.c). Aplicar en los Zod schemas:

```typescript
// ❌ Recoger más de lo necesario
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string(),          // ¿realmente necesario en el registro?
  birthdate: z.string(),      // ¿realmente necesario?
  country: z.string(),        // ¿realmente necesario?
});

// ✅ Mínimo viable — añadir campos solo cuando haya razón de negocio clara
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
});
```

---

## 5. Retención automática de datos

Cron job que aplica las políticas de retención definidas en `auditoria.md`:

```typescript
// app/api/crons/privacy-cleanup/route.ts
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // 1. Purgar audit logs generales > 90 días (no financieros ni de seguridad)
  await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: new Date(now.getTime() - 90 * 86400_000) },
      action: { notIn: ['LOGIN', 'LOGOUT', 'PAYMENT', 'GDPR_ERASURE'] },
    },
  });

  // 2. Purgar consentimientos > 3 años (conservar para auditoría pero no indefinidamente)
  await prisma.consentRecord.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - 3 * 365 * 86400_000) } },
  });

  // 3. Eliminar físicamente cuentas anonimizadas > 30 días
  //    (la anonimización ya ocurrió, este paso libera el registro)
  const staleAnonymized = await prisma.user.findMany({
    where: {
      anonymizedAt: { lt: new Date(now.getTime() - 30 * 86400_000) },
    },
    select: { id: true },
  });

  for (const user of staleAnonymized) {
    await prisma.user.delete({ where: { id: user.id } });
  }

  return Response.json({ data: { cleaned: true } });
}
```

Agregar al `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/crons/privacy-cleanup", "schedule": "0 3 * * 0" }
  ]
}
```

---

## 6. Notificación de brecha de seguridad

GDPR Art. 33: notificar a la autoridad de control en **72 horas** si hay una brecha que afecta datos personales.

Runbook mínimo:

```
1. Detectar (Sentry alert / anomaly en audit logs)
2. Contener (revocar tokens, cerrar sesiones, aislar servicio)
3. Evaluar (¿qué datos?, ¿cuántos usuarios?, ¿riesgo para los afectados?)
4. < 72 h: notificar a la autoridad de protección de datos del país
5. Si hay "alto riesgo" para los usuarios: notificarles directamente
6. Documentar todo en un Incident Report (ver disaster-recovery.md)
```

Template de email a usuarios afectados:

```
Asunto: Información importante sobre la seguridad de tu cuenta

Hemos detectado un acceso no autorizado a datos de nuestra plataforma.

Qué ocurrió: [descripción breve]
Qué datos pueden haberse visto afectados: [lista]
Qué hemos hecho: [medidas tomadas]
Qué debes hacer: [cambiar contraseña, revocar sesiones en /ajustes]

Fecha del incidente: [fecha]
Fecha de detección: [fecha]
```

---

## Variables de entorno

```env
# Versión de la política de privacidad — incrementar al publicar cambios
PRIVACY_POLICY_VERSION=2025-01
```

Agregar a `.env.example`.

---

## Checklist por feature nueva

Antes de mergear cualquier feature que toque datos de usuario:

- [ ] ¿Se recolecta solo lo mínimo necesario?
- [ ] ¿El dato tiene una base legal definida (contrato, consentimiento, interés legítimo)?
- [ ] ¿El dato queda cubierto por la exportación de datos existente?
- [ ] ¿El borrado GDPR anonimiza / elimina este dato?
- [ ] ¿Se agrega a `.env.example` si hay nuevas variables de terceros que procesan datos?

---

## Referencias

- [Soft Delete](/soft-delete.md) — borrado lógico para datos de negocio; GDPR requiere ir más lejos para PII
- [Auditoría](/auditoria.md) — políticas de retención por tipo de evento
- [Background Jobs](/background-jobs.md) — cron de limpieza de datos según retención
- [Analytics](/analytics.md) — preferir analytics sin cookies (Plausible/Fathom) para evitar banner de consentimiento
- [Sesiones](/sesiones.md) — invalidar todas las sesiones como parte del flujo de borrado
- [Rate Limiting](/decisiones/rate-limiting.md) — limitar exportaciones de datos para evitar scraping masivo
