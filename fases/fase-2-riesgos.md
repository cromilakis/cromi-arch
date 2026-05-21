# Fase 2: Análisis de Riesgos

**Propósito:** Identificar riesgos de seguridad, datos, rendimiento y cumplimiento **antes** de diseñar la arquitectura. Esto evita rediseños costosos más adelante.

## Actividades

- **Seguridad**: threat modeling basado en OWASP Top 10
- **Datos**: modelo entidad-relación, migraciones, índices necesarios
- **Rendimiento**: identificar posibles N+1 queries, necesidad de paginación, caching
- **Cumplimiento**: GDPR u otras regulaciones aplicables al dominio

## Artefactos

| Archivo | Descripción |
|---|---|
| `docs/threat-model.md` | Análisis de amenazas y mitigaciones |
| `docs/data-analysis.md` | Modelo de datos, índices, análisis de rendimiento |

## Gate Humano — Condicional

El agente evalúa si hay blockers antes de decidir si parar:

- **Sin blockers**: el agente avanza automáticamente a Fase 3 y notifica: *"Análisis de riesgos completado. Sin blockers. Avanzando a Fase 3 — revisa `docs/threat-model.md` cuando quieras."*
- **Con blockers** *(riesgo alto sin mitigación clara, decisión de compliance, cambio de scope)*: el agente para y presenta el bloqueo: *"Bloqueo detectado en análisis de riesgos: [descripción]. ¿Cómo procedemos?"*

Un bloqueo es un riesgo que **el agente no puede resolver solo** — requiere una decisión de negocio o contexto que solo el humano tiene.
