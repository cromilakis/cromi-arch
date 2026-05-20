# Fase 1: SDD Specification

**Propósito:** Generar una especificación formal usando **Spec Kit** (GitHub SDD). Transformar la idea aprobada en un documento de especificación estructurado.

## Actividades

1. Si no existe constitución del proyecto: corre `/speckit.constitution <topic>`
2. Corre `/speckit.specify <descripción>` para generar el spec.md
3. Si el spec generado contiene `[NEEDS CLARIFICATION]`, corre `/speckit.clarify`
4. Revisa que la especificación cubra:
   - Funcionalidades principales
   - Casos edge conocidos
   - Criterios de aceptación implícitos

## Artefactos

| Archivo | Descripción |
|---|---|
| `specs/NNN-feature/spec.md` | Especificación formal de la feature |

## Gate Humano

> "Spec generado en specs/NNN-feature/spec.md. ¿Apruebas, modificamos, o iteramos?"

✅ El humano revisa y aprueba el spec antes de pasar a Fase 2.
