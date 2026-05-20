# Fase 0: Intake y Clarificación

**Propósito:** Recibir la solicitud en lenguaje natural, desambiguar alcance, prioridad y criterios de éxito, y proponer un alcance inicial documentado.

## Actividades

1. El agente recibe la solicitud del humano (feature, bugfix, refactor)
2. El agente pregunta al humano para desambiguar:
   - Alcance exacto de lo que se pide
   - Prioridad (alta / media / baja)
   - Criterios de éxito (¿cómo sabemos que está listo?)
   - Dependencias o restricciones conocidas
3. El agente propone un alcance inicial documentado

## Artefactos

| Archivo | Descripción |
|---|---|
| `.specify/scope-initial.md` | Alcance documentado con criterios de éxito |

## Gate Humano

> "Este es el alcance propuesto. ¿Lo apruebas o ajustamos algo?"

✅ El humano aprueba el alcance antes de pasar a Fase 1.
