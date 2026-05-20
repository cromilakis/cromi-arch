# 🔍 Auditoría y Trazabilidad

## ¿Qué es audit logging?

Registrar **quién hizo qué, cuándo, desde dónde y qué cambió** dentro de la aplicación. No es monitoreo (Sentry) ni logs de aplicación (Pino) — es trazabilidad de negocio.

## Estrategia

Usamos **Prisma middleware** + **tabla dedicada** + **API middleware**:

```
┌──────────────────────────────────────────────┐
│ API Request → Middleware (IP, User, Endpoint) │
└──────────────────┬───────────────────────────┘
                   ▼
┌──────────────────────────────────────────────┐
│ Route Handler → Prisma Extension             │
│   (create/update/delete)                     │
│   → Guarda automáticamente en audit_logs     │
└──────────────────┬───────────────────────────┘
                   ▼
┌──────────────────────────────────────────────┐
│ Tabla audit_logs (PostgreSQL)                │
│   → Consultable, retención configurable      │
│   → Vista de actividad por usuario/fecha     │
└──────────────────────────────────────────────┘
```

## Modelo Prisma

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  
  // Quién
  userId      String?
  userEmail   String?
  userRole    String?
  
  // Qué
  action      String   // CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT
  entity      String   // User, Project, Order, etc.
  entityId    String?  // ID del registro afectado
  
  // Detalle
  description String?  // "Actualizó email de usuario X"
  changes     Json?    // { "before": {"email": "..."}, "after": {"email": "..."} }
  metadata    Json?    // IP, user-agent, requestId, etc.
  
  // Cuándo
  createdAt   DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([entity, entityId])
  @@index([action, createdAt])
  @@index([createdAt])
}
```

## Prisma Extension para auditoría automática

```ts
// src/lib/prisma/audit.ts
import { Prisma } from '@prisma/client'

export const auditExtension = Prisma.defineExtension({
  name: 'audit',
  query: {
    async $allOperations({ model, operation, args, query }) {
      const result = await query(args)
      
      // Solo auditar mutaciones
      if (!['create', 'update', 'delete', 'upsert'].includes(operation)) {
        return result
      }
      
      // Registrar auditoría de forma asíncrona (no bloqueante)
      // NOTA: Usar la instancia extendida de prisma para evitar
      // bucles infinitos. La extensión se aplica con $$extends.
      auditLogAsync({
        userId: getCurrentUserId(),
        userEmail: getUserEmail(),
        action: operation.toUpperCase(),
        entity: model,
        entityId: result?.id || args.where?.id,
        description: buildDescription(operation, model, args),
        changes: {
          before: operation === 'update' ? null : null,
          after: args.data || null,
        },
        metadata: {
          ip: getRequestIP(),
          userAgent: getUserAgent(),
          timestamp: new Date().toISOString(),
        },
      }).catch((err) => {
        console.error('[Audit] Error logging audit event:', err)
      })
      
      return result
    },
  },
})

// Logger asíncrono separado para evitar bucles en la extensión
async function auditLogAsync(data: AuditLogData) {
  const { prisma } = await import('@/lib/db')
  await prisma.auditLog.create({ data })
}
```
```

## API Middleware para auditoría de acceso

```ts
// src/middleware.ts o por route handler
export async function auditAccess(endpoint: string, req: Request) {
  const session = await getSession()
  
  await prisma.auditLog.create({
    data: {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      action: 'ACCESS',
      entity: 'API',
      entityId: endpoint,
      metadata: {
        method: req.method,
        ip: req.headers.get('x-forwarded-for'),
        userAgent: req.headers.get('user-agent'),
      },
    },
  })
}
```

## Eventos que deben auditarse siempre

| Evento | Acción | Por qué |
|--------|--------|---------|
| Login exitoso/fallido | LOGIN | Seguridad |
| Logout | LOGOUT | Sesión |
| Crear usuario | CREATE | Trazabilidad |
| Cambiar email/rol | UPDATE | Cumplimiento |
| Eliminar recurso | DELETE | Recuperación |
| Exportar datos | EXPORT | Privacidad |
| Cambio de contraseña | UPDATE | Seguridad |
| Pago realizado | CREATE | Financiero |
| Rol/permisos modificados | UPDATE | Auditoría |

## Retención

| Tipo | Retención | Destino |
|------|-----------|---------|
| Auditoría general | 90 días | PostgreSQL (tabla audit_logs) |
| Eventos de seguridad | 1 año | PostgreSQL + backup |
| Eventos financieros | 5 años | PostgreSQL + backup cifrado |

## Consultas útiles

```sql
-- Actividad reciente de un usuario
SELECT * FROM audit_logs 
WHERE userId = 'user-id' 
ORDER BY createdAt DESC 
LIMIT 50;

-- Cambios en una entidad específica
SELECT * FROM audit_logs 
WHERE entity = 'Order' AND entityId = 'order-123'
ORDER BY createdAt DESC;

-- Intentos de login fallidos
SELECT * FROM audit_logs 
WHERE action = 'LOGIN' AND metadata->>'success' = 'false'
  AND createdAt > NOW() - INTERVAL '24 hours';
```

## Dashboard de auditoría (futuro)

Se puede construir una vista de actividad con:
- Timeline por usuario
- Cambios recientes en entidades críticas
- Alertas por acciones sospechosas (múltiples logins fallidos, accesos fuera de horario, etc.)
