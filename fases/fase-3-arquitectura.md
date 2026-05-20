# Fase 3: Arquitectura y Diseño

**Propósito:** Diseñar la arquitectura técnica completa: API, base de datos, componentes React, y estrategias transversales.

## Actividades

- Diseñar REST API (Route Handlers de Next.js)
- Diseñar DB schema (Prisma) basado en el análisis de datos de Fase 2
- Diseñar componentes React y layout de la UI
- Especificar contratos API en `contracts/`
- Definir estrategias:
  - Auth (Auth.js v5)
  - Manejo de errores (Error Boundaries + TanStack Query + Sentry)
  - Estado del servidor (TanStack Query)
  - Validación (Zod en capa de entrada)
  - i18n (next-intl)

## Artefactos

| Archivo | Descripción |
|---|---|
| `docs/architecture.md` | Documento de arquitectura completa |
| `specs/NNN-feature/contracts/` | Contratos API (request/response) |

## Gate Humano

> "Arquitectura propuesta en docs/architecture.md. ¿Apruebas?"

✅ El humano aprueba el diseño antes de pasar a Fase 4.
