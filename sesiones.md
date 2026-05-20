# Manejo de Sesiones con Auth.js v5

> **Actualización (Mayo 2025):** El proyecto Auth.js se ha unido a [Better Auth](https://better-auth.com). Para proyectos nuevos, evaluar Better Auth como alternativa. Auth.js v4/v5 siguen siendo mantenidos pero no reciben nuevas features principales.

## JWT vs Sesiones en Base de Datos

Auth.js v5 soporta dos estrategias. Decisión según el caso de uso:

| Característica | JWT | Database Sessions |
|---------------|-----|-------------------|
| Escalabilidad | Alta (sin DB lookup) | Media (consulta DB) |
| Invalidación | Difícil (hasta expirar) | Inmediata |
| Almacenamiento | Cookie (~4KB max) | Tabla `session` en DB |
| Multi-dispositivo | Un solo token | Múltiples sesiones |

**Recomendación:** Usar **JWT** para APIs y **Database Sessions** para apps web con requisitos de seguridad críticos.

Configuración en `auth.ts`:

```typescript
import NextAuth from 'next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' }, // o 'database'
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
});
```

## Estrategia de Refresh Token

Para JWT de larga duración:

```typescript
session: {
  maxAge: 30 * 24 * 60 * 60, // 30 días
  updateAge: 24 * 60 * 60,    // refresh cada 24h
}
```

Auth.js v5 renueva el JWT automáticamente cuando se accede a la sesión dentro de `updateAge`.

## Session Timeout

Timeout por inactividad:

```typescript
// En auth.config.ts
export const authConfig = {
  session: {
    maxAge: 60 * 60, // 1 hora de inactividad
  },
};
```

## Soporte Multi-Dispositivo

Con Database Sessions, cada dispositivo tiene su propia sesión:

```sql
-- Tabla session (prisma)
model Session {
  id           String   @id @default(cuid())
  userId       String
  expiresAt    DateTime
  deviceInfo   String?  -- "Chrome/120, Windows 11"
  lastActiveAt DateTime @default(now())
}
```

Mostrar al usuario una lista de sesiones activas con opción de cerrar sesiones remotas.

## Invalidación al Cambiar Contraseña

Al cambiar contraseña, invalidar **todas las sesiones** del usuario:

```typescript
// app/api/auth/change-password/route.ts
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Cambiar contraseña
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });

  // Invalidar todas las sesiones (si usa database sessions)
  await prisma.session.deleteMany({
    where: { userId: session.user.id },
  });

  // Forzar nuevo login
  return Response.json({ data: { message: 'Password changed. Please log in again.' } });
}
```

Si usa JWT, el token actual sigue siendo válido hasta expirar — incremente `tokenVersion` en DB y revíselo en el callback `jwt`.
