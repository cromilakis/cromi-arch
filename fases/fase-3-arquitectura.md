# Fase 3: Arquitectura y Diseño

**Propósito:** Diseñar la arquitectura técnica completa: API, base de datos, componentes React, estrategias transversales, **y el diseño UX/visual aprobado antes de escribir una sola línea de código**.

## Actividades

### Diseño UX (primero)

Antes de diseñar la arquitectura técnica, los flujos y pantallas deben estar acordados visualmente. Implementar sin diseño aprobado genera retrabajo en Fase 5.

- Crear wireframes o mockups de las pantallas involucradas
- Identificar flujos de usuario (happy path + edge cases)
- Validar que los design tokens (colores, tipografía, espaciado) del sistema de diseño están definidos
- Gate de diseño: el humano aprueba los wireframes/mockups **antes** de continuar con arquitectura técnica

### Arquitectura técnica (después del diseño aprobado)

- Diseñar REST API (Route Handlers de Next.js)
- Diseñar DB schema (Prisma) basado en el análisis de datos de Fase 2
- Diseñar componentes React alineados con los mockups aprobados
- Especificar contratos API en `contracts/`
- Definir estrategias:
  - Auth (Auth.js v5)
  - Manejo de errores (Error Boundaries + TanStack Query + Sentry)
  - Estado del servidor (TanStack Query)
  - Validación (Zod en capa de entrada)
  - i18n (next-intl)
- Escribir el borrador del ADR correspondiente a las decisiones clave tomadas aquí

> **Nota ADRs:** Los ADRs se redactan como borrador en el momento de la decisión (aquí, en Fase 1 y Fase 2). En Fase 10 se revisan, completan y publican definitivamente. No esperar al final para crear el ADR — se pierde el contexto del por qué.

## Artefactos

| Archivo | Descripción |
|---|---|
| `docs/ux/wireframes/` | Wireframes o mockups de pantallas (Figma export, PNG, o Pencil) |
| `docs/ux/user-flows.md` | Flujos de usuario con estados y transiciones |
| `docs/architecture.md` | Documento de arquitectura completa |
| `specs/NNN-feature/contracts/` | Contratos API (request/response) |
| `docs/adr/adr-NNN-*.md` | Borrador de ADRs por decisión arquitectónica |

## Gate Humano

Este gate tiene dos momentos:

1. **Gate de diseño UX**: "Wireframes en docs/ux/. ¿Apruebas los flujos y pantallas antes de continuar?"
2. **Gate de arquitectura técnica**: "Arquitectura propuesta en docs/architecture.md. ¿Apruebas?"

✅ Ambos aprobados antes de pasar a Fase 4.
