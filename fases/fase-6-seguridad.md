# Fase 6: Seguridad (day 1)

**Propósito:** Aplicar controles de seguridad desde el día 1. No se posterga — se hace antes del testing integral.

## Actividades

- [x] Zod schemas en **todos** los inputs de API (validación estricta)
- [x] Rate limiting en endpoints sensibles:
  - Login/Register: 5 intentos → bloqueo 15 min por IP
  - API pública: 100 req/min por IP
  - API autenticada: 1000 req/min por usuario
  - Password reset: 3 intentos → bloqueo 1 hora
- [x] CSRF, XSS, SQL injection prevention
- [x] Headers de seguridad en `next.config.js`
- [x] Auth middleware para rutas protegidas
- [x] RBAC testeado
- [x] Semgrep en pre-commit (análisis estático automático)
- [x] Secrets en `.env` (nunca en git)
- [x] `npm audit` sin vulnerabilidades high/critical

## Artefactos

| Archivo | Descripción |
|---|---|
| `docs/security-audit.md` | Reporte de auditoría de seguridad completo |

## Gate Humano

> "Security audit en docs/security-audit.md. ¿Apruebas?"

✅ El humano audita y aprueba antes de pasar a Fase 7.
