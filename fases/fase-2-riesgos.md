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

## Gate Humano

> "Análisis de riesgos completado en docs/threat-model.md y docs/data-analysis.md. ¿Apruebas?"

✅ El humano aprueba el análisis antes de pasar a Fase 3.
