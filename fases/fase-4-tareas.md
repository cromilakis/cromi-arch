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

## Gate Humano

> "Tareas desglosadas en tasks.md. ¿En qué orden las ejecutamos?"

✅ El humano prioriza y ordena las tareas antes de pasar a Fase 5.
