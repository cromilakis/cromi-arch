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

## Gate Humano — Condicional

El spec formaliza el scope aprobado en Fase 0. Si no agrega información nueva, no hay decisión que tomar.

- **Spec sin ambigüedades** *(no contiene `[NEEDS CLARIFICATION]`, cubre todos los criterios de éxito del scope)*: el agente avanza automáticamente: *"Spec generado en `specs/NNN-feature/spec.md`. Formaliza el scope aprobado sin nuevas preguntas. Avanzando a Fase 2."*
- **Spec con ambigüedades** *(contiene `[NEEDS CLARIFICATION]` o revela edge cases no cubiertos en el scope)*: el agente para y presenta las preguntas con opciones siguiendo el protocolo de Fase 0: *"El spec revela [N] puntos sin definir en el scope. ¿Cómo los resolvemos?"*
