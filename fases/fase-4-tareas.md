# Fase 4: Tareas BDD-Ready

**Propósito:** Desglosar la especificación en tareas ejecutables. Cada tarea sigue el formato: Feature File Gherkin → Step Definitions → Código.

## Actividades

1. Desglosar la feature en tareas atómicas
2. Cada tarea debe producir:
   - Un Feature File Gherkin (`.feature`)
   - Step Definitions (TypeScript con Playwright BDD)
   - Código de implementación en `src/`
3. Marcar tareas paralelizables con `[P]`
4. Definir dependencias entre tareas (si existen)

## Artefactos

| Archivo | Descripción |
|---|---|
| `specs/NNN-feature/tasks.md` | Lista de tareas con prioridad y dependencias |

## Gate Humano — Condicional

El agente propone el orden de ejecución con justificación y avanza automáticamente salvo que haya una restricción que no pueda inferir:

- **Sin restricciones externas**: el agente ordena las tareas por dependencias técnicas, marca las paralelizables `[P]`, y avanza: *"Tareas ordenadas en `tasks.md`. Ejecutaré en el orden propuesto — avísame si tienes alguna restricción de prioridad."*
- **Con ambigüedad de prioridad** *(dos tareas sin dependencia técnica entre sí y con impacto de negocio diferente)*: el agente para y pregunta: *"Las tareas T2 y T3 son independientes. ¿Cuál tiene más prioridad para ti?"*

El humano no necesita ordenar las tareas — solo confirmar o ajustar si tiene contexto de negocio que el agente no tiene.
