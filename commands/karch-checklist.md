# karch-checklist — Gate de calidad por fase y dominio

## Cómo usar este skill

Invocar al cierre de cada fase antes de avanzar:
```
/karch-checklist phase=<N> issue="<título o descripción breve del issue>"
```

El agente ejecuta dos pasos:
1. **Detecta dominios** — lee el issue/spec y activa las secciones condicionales que aplican
2. **Verifica activamente** — para cada dominio activo, va al código y confirma cumplimiento. No marca ✓ sin verificar.

---

## Paso 1 — Detección de dominios condicionales

Leer el issue, `specs/NNN/spec.md` y `docs/architecture.md`. Activar cada dominio donde se cumpla al menos una condición:

| Dominio | Activar si el issue/spec menciona o implica... |
|---------|-----------------------------------------------|
| `payments` | pagos, Stripe, precio, suscripción, factura, checkout, cobro |
| `auth` | login, logout, sesión, token, registro, contraseña, OAuth |
| `file-upload` | subir archivo, imagen, documento, adjunto, storage |
| `privacy` | datos personales, GDPR, email, teléfono, dirección, PII |
| `api` | endpoint nuevo, Route Handler nuevo, API pública |
| `background-jobs` | cron, job, queue, Inngest, tarea asíncrona, scheduled |
| `realtime` | websocket, SSE, tiempo real, live, notificación push |
| `rbac` | rol, permiso, admin, owner, acceso restringido |
| `notifications` | email, push, SMS, notificación, alerta al usuario |
| `search` | búsqueda, filtro, query, autocomplete, full-text |
| `forms` | formulario, input del usuario, validación, submit |
| `database` | schema nuevo, migration, modelo Prisma, tabla, índice |
| `monitoring` | alerta, dashboard, métrica, health, observabilidad |

---

## Paso 2 — Verificación por dominio

### Secciones base — activas en toda fase y feature

#### `code-quality` (Phase 3, 5, 7)
```bash
npx tsc --noEmit          # cero errores TypeScript
npm run lint               # cero errores ESLint
```
- [ ] Sin `any` sin justificación documentada en comentario
- [ ] Sin `console.log` — usar Pino (`import { logger } from '@/lib/logger'`)
- [ ] Sin `TODO` ni `FIXME` sin issue asociado
- [ ] Nombres descriptivos: variables, funciones, componentes, archivos
- [ ] Funciones de más de 40 líneas: extraídas en helpers con nombre
- [ ] Sin código comentado — si no se usa, se elimina
- [ ] Imports organizados: externos → internos → relativos

#### `ci-local` (Phase 5 — antes de cada commit)
```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
npx semgrep --config auto src/ --error
```
- [ ] Todos los comandos anteriores retornan exit code 0
- [ ] Husky pre-commit no fue saltado con `--no-verify`
- [ ] Sin archivos `.env` ni secrets commiteados (`git diff --cached | grep -i "sk-\|secret\|password\|token"`)

#### `security-base` (Phase 5, 6)
- [ ] Todo input de usuario validado con Zod antes de procesarse
- [ ] Auth check en todo Route Handler protegido: `const session = await auth(); if (!session?.user?.id) return 401`
- [ ] BOLA check en recursos con ownership: `if (resource.userId !== session.user.id) return 403`
- [ ] Sin SQL crudo — solo Prisma ORM
- [ ] Headers de seguridad configurados (verificar `next.config.ts`)
- [ ] Sin datos sensibles en logs (`redact` configurado en Pino)
- [ ] `.env.example` actualizado con toda variable nueva del PR

---

### Secciones UI — activas cuando la feature toca pantalla

#### `ui-playground` (Phase 3, 5, 7)
```bash
grep -rn "<h[1-6]\|<button\|<input\|<select\|<textarea\|<p \|<p>" \
  src/app/ --include="*.tsx" | grep -v playground | grep -v ".test."
# Debe retornar vacío
```
- [ ] El grep anterior no produce output — cero HTML nativo en pages
- [ ] Cada componente nuevo tiene entrada en `src/app/[locale]/playground/page.tsx`
- [ ] El playground es navegable en `/playground` y muestra todas las variantes

#### `ui-i18n` (Phase 3, 5, 7)
```bash
grep -rn '"[A-Z][a-z]' src/app/ --include="*.tsx" | grep -v ".test." | grep -v "//.*\""
grep -rn "from 'next/link'" src/ --include="*.tsx" --include="*.ts"
grep -rn "from \"next/link\"" src/ --include="*.tsx" --include="*.ts"
grep -rn "usePathname" src/ --include="*.tsx" --include="*.ts" | grep "next/navigation"
```
- [ ] Cero strings hardcodeados visibles en JSX — todo usa `t('key')`
- [ ] `Link` importado de `createNavigation` (next-intl), nunca de `next/link`
- [ ] `usePathname` importado de `createNavigation` (next-intl), nunca de `next/navigation`
- [ ] Todos los layouts/pages bajo `[locale]` llaman `setRequestLocale`
- [ ] Claves i18n agregadas en todos los archivos de mensajes (`messages/es.json`, `messages/en.json`, etc.)

#### `ui-states` (Phase 3, 5)
- [ ] Cada pantalla tiene los 5 estados diseñados: loading, empty, error, success, edge case
- [ ] Estado `loading`: skeleton o spinner usando componente del playground
- [ ] Estado `error`: mensaje recuperable + acción de retry
- [ ] Estado `empty`: mensaje descriptivo + call to action
- [ ] Sin valores hardcodeados de color o tipografía — solo design tokens de Tailwind

#### `ui-a11y` (Phase 7)
```bash
npx bddgen && npx playwright test --grep "accessibility"
```
- [ ] 0 violaciones críticas/serias de axe-playwright
- [ ] Todos los inputs tienen `label` asociado
- [ ] Todos los botones tienen texto descriptivo o `aria-label`
- [ ] Imágenes tienen `alt` descriptivo (no vacío ni "imagen")
- [ ] Navegación por teclado funciona en todos los flujos principales

---

### Secciones condicionales

#### `payments` — Stripe, pagos, suscripciones
Referencia: `kromi-search "stripe webhook idempotency payment patterns"`
- [ ] Webhooks verifican la firma: `stripe.webhooks.constructEvent(body, sig, secret)`
- [ ] Toda operación de cobro es idempotente (idempotency key en la llamada a Stripe)
- [ ] No se almacenan datos de tarjeta — solo tokens de Stripe
- [ ] Webhook handler responde 200 antes de procesar (para evitar retries de Stripe)
- [ ] Eventos de webhook manejados en background job, no en el handler directamente
- [ ] Logs de transacciones sin PAN ni CVV — solo `payment_intent_id`
- [ ] Modo test en dev/staging, modo live solo en producción (verificar en `.env.example`)

#### `auth` — sesiones, login, tokens
Referencia: `kromi-search "auth session management CSRF token rotation"`
- [ ] Sesiones con expiración configurada en Auth.js
- [ ] Tokens de refresh rotados en cada uso
- [ ] Logout invalida la sesión en el servidor (no solo borra cookie)
- [ ] Rutas protegidas verificadas en middleware — no solo en el componente
- [ ] Contraseñas hasheadas con bcrypt (mínimo 12 rounds) — nunca en texto plano
- [ ] Rate limiting en endpoints de login y registro (ver `decisiones/rate-limiting.md`)

#### `file-upload` — archivos, imágenes, documentos
Referencia: `kromi-search "file upload validation MIME type size limit"`
- [ ] Validación de tipo MIME en el servidor (no confiar en extensión del cliente)
- [ ] Límite de tamaño configurado y rechazado con 413 si se excede
- [ ] Nombre de archivo sanitizado antes de almacenar (sin path traversal)
- [ ] Archivos almacenados en Supabase Storage, nunca en el filesystem del server
- [ ] URL de acceso con expiración (signed URL), nunca pública por defecto
- [ ] Escaneo de malware si el archivo es procesado o re-distribuido

#### `privacy` — datos personales, GDPR
Referencia: `kromi-search "GDPR privacy data retention audit log anonymization"`
- [ ] Datos personales identificados en el modelo Prisma con comentario `// PII`
- [ ] Política de retención definida: ¿cuánto tiempo se guardan?
- [ ] Derecho al olvido implementado: `anonymize()` o eliminación física disponible
- [ ] Audit log de acciones sobre datos personales (quién accedió, cuándo)
- [ ] Consentimiento explícito registrado antes de procesar datos sensibles
- [ ] Datos de PII excluidos de logs con `redact` en Pino

#### `api` — endpoints, Route Handlers públicos
Referencia: `kromi-search "rate limiting API versioning response format contracts"`
- [ ] Rate limiting aplicado (ver thresholds en `decisiones/rate-limiting.md`)
- [ ] Respuesta sigue el contrato: `{ data }` en éxito, `{ error, code }` en error
- [ ] Endpoint documentado en `specs/NNN/contracts/`
- [ ] Método HTTP correcto: GET solo lectura, POST/PUT/PATCH para escritura, DELETE para borrado
- [ ] Paginación en endpoints que devuelven listas (nunca devolver todo sin límite)
- [ ] CORS configurado — no `*` en producción

#### `database` — schema, migraciones, queries
Referencia: `kromi-search "database patterns migrations expand contract soft delete indexes"`
- [ ] Migración sigue patrón expand-contract (ver `/karch-migration`)
- [ ] Índices creados para campos usados en `WHERE`, `ORDER BY` o `JOIN`
- [ ] Soft delete implementado con `deletedAt` — nunca borrado físico de datos de negocio
- [ ] Queries de lista tienen `take`/`skip` — sin `findMany()` sin límite
- [ ] Transacciones usadas donde hay múltiples escrituras relacionadas
- [ ] Connection pool configurado para el entorno (ver `connection-pooling.md`)
- [ ] Migración revisada manualmente — no aplicada automáticamente en producción

#### `background-jobs` — cron, queue, Inngest
Referencia: `kromi-search "background jobs idempotency retry dead letter inngest"`
- [ ] Job es idempotente — puede ejecutarse dos veces sin efectos duplicados
- [ ] Estrategia de retry configurada con backoff exponencial
- [ ] Dead-letter queue o fallback para jobs que fallan repetidamente
- [ ] Timeout definido — ningún job puede correr indefinidamente
- [ ] Logs estructurados al inicio y fin de cada ejecución con `jobId`
- [ ] Job no bloquea el request principal — siempre disparado en background

#### `realtime` — websockets, SSE, live updates
Referencia: `kromi-search "realtime websocket SSE reconnection backpressure"`
- [ ] Reconexión automática con backoff en el cliente
- [ ] Auth verificada en el handshake inicial — no solo en HTTP
- [ ] Backpressure manejado — no enviar eventos más rápido de lo que el cliente procesa
- [ ] Limpieza de listeners en `useEffect` cleanup (sin memory leaks)
- [ ] Fallback a polling si WebSocket no está disponible

#### `rbac` — roles, permisos, admin
Referencia: `kromi-search "RBAC role based access control audit trail ownership"`
- [ ] Verificación de rol en el servidor — nunca solo en el cliente
- [ ] Ownership check en cada recurso: solo el dueño o admin puede modificar
- [ ] Audit trail: toda acción administrativa registrada con userId, acción y timestamp
- [ ] Roles definidos en enum de Prisma — sin strings mágicos
- [ ] UI de admin inaccesible para roles no autorizados (middleware + layout check)

#### `notifications` — email, push, SMS
Referencia: `kromi-search "notifications email deduplication preferences unsubscribe"`
- [ ] Deduplicación: no enviar la misma notificación dos veces (idempotency key)
- [ ] Preferencias del usuario respetadas (puede desactivar tipos de notificación)
- [ ] Enlace de unsubscribe en todo email de marketing
- [ ] Plantilla renderizada y previewed antes de enviar en producción
- [ ] Rate limit de envío para evitar spam accidental
- [ ] Logs de envío con estado: enviado / rebotado / error

#### `search` — búsqueda, filtros, autocomplete
Referencia: `kromi-search "search full text indexing pagination debounce"`
- [ ] Debounce en el input del cliente (mínimo 300ms)
- [ ] Búsqueda paginada — sin traer todos los resultados de una vez
- [ ] Índice de texto completo en los campos buscados (Prisma `@@fulltext` o pgvector)
- [ ] Sanitización del término de búsqueda antes de pasarlo a la query
- [ ] Estado `empty` diseñado cuando no hay resultados

#### `forms` — formularios, inputs del usuario
Referencia: `kromi-search "forms react hook form zod validation error states"`
- [ ] Validación client-side con Zod + React Hook Form
- [ ] Validación server-side con el mismo schema Zod — nunca confiar solo en el cliente
- [ ] Errores mostrados por campo, no solo un mensaje genérico al final
- [ ] Estado de loading durante submit (botón deshabilitado, spinner visible)
- [ ] Submit deshabilitado si el form tiene errores de validación
- [ ] Datos sensibles (contraseña) con `type="password"` — sin autocomplete malicioso

#### `monitoring` — Sentry, alertas, runbook
Referencia: `kromi-search "sentry monitoring health check alerts runbook"`
- [ ] Errores capturados en Sentry con contexto: `Sentry.captureException(e, { tags, extra })`
- [ ] Health endpoint responde 200 con `{ status: 'healthy' }`
- [ ] Logs estructurados con Pino — sin `console.log` en producción
- [ ] Alerta configurada si el health endpoint deja de responder
- [ ] Runbook actualizado con el nuevo comportamiento o posibles errores del feature

---

## Mapa de dominios por fase

| Fase | Siempre activo | Condicional (según issue) |
|------|---------------|--------------------------|
| **3** — Arquitectura | `code-quality`, `security-base`, `ui-states`* | `payments`, `auth`, `database`, `api`, `privacy`, `rbac` |
| **5** — Implementación | `code-quality`, `ci-local`, `security-base`, `ui-playground`*, `ui-i18n`* | todos los detectados |
| **6** — Seguridad | `security-base` (completo) | `payments`, `auth`, `file-upload`, `privacy`, `rbac` |
| **7** — Testing | `code-quality`, `ui-a11y`* | `forms`, `search`, `notifications` |
| **8** — Monitoreo | `monitoring` | `background-jobs`, `realtime` |
| **9** — CI/CD | `ci-local` | — |

*Solo si la feature tiene UI

---

## Gate de cierre

Al finalizar la verificación, reportar:

```
✓ Dominios activos: [lista]
✓ Secciones base: code-quality, ci-local, security-base
✓ Secciones UI: ui-playground, ui-i18n
✓ Secciones condicionales: [lista de las activadas]

Items fallidos: [lista o "ninguno"]
```

Si hay items fallidos → corregir antes de avanzar de fase. No se avanza con items pendientes.
