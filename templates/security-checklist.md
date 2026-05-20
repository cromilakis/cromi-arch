# Security Checklist — Next.js + PostgreSQL

## Autenticación y Autorización
- [ ] Passwords hasheados con bcrypt/argon2
- [ ] JWT con expiración corta (15min) + refresh tokens
- [ ] Rate limiting en login: 5 intentos → bloqueo 15 min por IP
- [ ] MFA opcional implementada
- [ ] Session invalidation en logout
- [ ] RBAC: roles (admin, user) con tests
- [ ] Auth middleware protege rutas privadas
- [ ] next-auth.js / Auth.js v5 configurado correctamente

## Input Validation (Zod)
- [ ] Zod schemas en TODAS las API routes y Server Actions
- [ ] Sanitización de inputs (escape HTML, prevenir XSS)
- [ ] Validación de tipos, formatos, longitudes
- [ ] File upload: tipo MIME, tamaño máximo, scan opcional

## API Security
- [ ] CSRF protection activa (Next.js built-in + double-submit cookie)
- [ ] CORS whitelist restrictivo (no `*`)
- [ ] API keys en server-side env vars (no `NEXT_PUBLIC_`)
- [ ] Rate limiting por endpoint (Upstash o middleware custom)
- [ ] SQL injection: Prisma parametriza todo (verificar en raw queries)

## HTTP Security Headers (next.config.js)
- [ ] `Content-Security-Policy`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 0` (deprecated pero harmless)
- [ ] `Strict-Transport-Security` (HSTS)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` (restringir APIs del navegador)

## Frontend Security
- [ ] React escapa XSS por defecto — verificar `dangerouslySetInnerHTML`
- [ ] No secrets en client-side code
- [ ] Content Security Policy en producción
- [ ] Subresource Integrity (SRI) en scripts externos

## Database Security
- [ ] Conexiones SSL/TLS a PostgreSQL
- [ ] Usuario de DB con permisos mínimos (no superuser)
- [ ] Connection pooling seguro (PgBouncer)
- [ ] Queries lentas monitoreadas (pg_stat_statements)
- [ ] Backups encriptados y automatizados

## Infrastructure Security
- [ ] Secrets en .env, NUNCA en código
- [ ] .env.example sin valores reales
- [ ] Docker images escaneadas (Trivy, Snyk)
- [ ] Dependencias auditadas: `npm audit` en CI
- [ ] Dependabot / Renovate activo
- [ ] HTTPS enforcement (Vercel automático o nginx)
- [ ] CORS, rate limiting, WAF (si aplica)

## Compliance
- [ ] GDPR: consentimiento explícito, derecho al olvido
- [ ] Logging de acceso a datos personales
- [ ] Términos de servicio y política de privacidad
- [ ] Data retention policy documentada
- [ ] Cookie consent banner

## Automation
- [ ] Security tests en CI (ZAP, SQLMap automation)
- [ ] npm audit como paso de CI
- [ ] Secret scanning en CI (GitHub secret scanning)
- [ ] Dependabot alerts monitoreadas
