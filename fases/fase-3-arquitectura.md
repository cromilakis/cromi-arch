# Fase 3: Arquitectura y Diseño

**Propósito:** Diseñar la arquitectura técnica completa: API, base de datos, componentes React, estrategias transversales, **y el diseño UX/visual aprobado antes de escribir una sola línea de código**.

## Actividades

### Diseño UX (primero)

Antes de diseñar la arquitectura técnica, los flujos y pantallas deben estar acordados visualmente. Implementar sin diseño aprobado genera retrabajo en Fase 5.

- Crear wireframes o mockups de las pantallas involucradas
- Documentar el flujo de usuario: happy path + mínimo 2 edge cases
- Definir los 5 estados de cada pantalla (loading, empty, error, success, edge case) — ver [`component-patterns.md`](/component-patterns.md)
- Verificar que colores y tipografía usan tokens existentes — ver [`design-system.md`](/design-system.md)
- Descomponer la pantalla en componentes: ninguno puede ser HTML crudo — ver [`estandares-diseno.md`](/estandares-diseno.md)
- Indicar si cada componente es Server o Client Component — ver [`components.md`](/components.md)
- Definir breakpoints responsive (mobile-first)

#### Checklist de aprobación UX

El gate de diseño solo procede si todo lo siguiente está definido:

| # | Criterio | Referencia |
|---|---|---|
| 1 | Cada pantalla tiene los 5 estados diseñados (loading, empty, error, success, edge) | `component-patterns.md` |
| 2 | Ningún elemento de UI es HTML crudo — todo es componente | `estandares-diseno.md` |
| 3 | Colores y tipografía provienen de tokens existentes, sin hardcodear | `design-system.md` |
| 4 | Flujo de usuario documentado: happy path + ≥ 2 edge cases | `docs/ux/user-flows.md` |
| 5 | Cada componente tiene definido si es Server o Client Component | `components.md` |
| 6 | Responsive: mobile-first, breakpoints `sm/md/lg` especificados | `estandares-diseno.md` |
| 7 | Textos visibles usan claves i18n, no strings hardcodeados | `i18n.md` |

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

Este gate tiene dos momentos y **ambos son siempre-stop** (el agente no avanza sin aprobación explícita):

1. **Gate de diseño UX** *(solo si la feature tiene interfaz de usuario)*
   > "Diseño UX en `docs/ux/`. Checklist de 7 criterios: todos cumplidos. ¿Apruebas los flujos y pantallas?"

2. **Gate de arquitectura técnica**
   > "Arquitectura propuesta en `docs/architecture.md`. ¿Apruebas?"

✅ Ambos aprobados antes de pasar a Fase 4. Para features puramente backend, solo aplica el gate de arquitectura.
