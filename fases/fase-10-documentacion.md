# Fase 10: Documentación

**Propósito:** Documentar todo el proyecto **al final**, después de iterar. Esto evita documentar código que aún va a cambiar.

## Actividades

### ADRs — completar borradores, no crear desde cero

Los ADRs **no se escriben retrospectivamente**. Se crean como borradores en el momento de la decisión (Fases 1, 2 y 3) y aquí se completan, revisan y publican definitivamente. Un ADR escrito semanas después pierde el contexto del por qué se eligió X sobre Y.

En Fase 10, por cada borrador de ADR existente:
- Completar el campo "Consecuencias observadas" con lo que realmente pasó
- Documentar si la decisión fue correcta o se arrepintieron y por qué
- Añadir links al código que implementa la decisión

### Resto de actividades

- README.md con instrucciones de setup y guía de inicio rápido
- Feature files como **living documentation** (los tests BDD son la documentación viva)
- Runbook: revisar y completar el iniciado en Fase 8 (`docs/runbook.md`)
- Documentación de API endpoints (generada desde los contratos de Fase 3)

## Artefactos

| Archivo | Descripción |
|---|---|
| `docs/` | Documentación completa del proyecto |
| `docs/adr/` | ADRs completados (borradores iniciados en Fases 1-3) |
| `docs/runbook.md` | Runbook completo (iniciado en Fase 8) |
| `README.md` | Setup y guía de inicio rápido |

## ADRs recomendados

Los borradores deben existir desde las fases previas. Aquí se completan:

```
docs/adr/
├── adr-001-stack-tecnologico.md        ← borrador: Fase 1
├── adr-002-arquitectura-api.md         ← borrador: Fase 3
├── adr-003-bdd-playwright.md           ← borrador: Fase 3
├── adr-004-error-handling.md           ← borrador: Fase 3
├── adr-005-testing-strategy.md         ← borrador: Fase 3
└── adr-006-migration-strategy.md       ← borrador: Fase 9
```

## Template de ADR

```markdown
# ADR-NNN: [Título de la decisión]

**Estado:** Aceptada | En revisión | Deprecada
**Fecha de decisión:** YYYY-MM-DD (cuando se tomó, no cuando se escribió)
**Fase donde se tomó:** Fase N

## Contexto
¿Qué problema o pregunta forzó esta decisión?

## Opciones consideradas
1. Opción A — pros/cons
2. Opción B — pros/cons

## Decisión
Se eligió [opción] porque [razón].

## Consecuencias observadas (completar en Fase 10)
¿Fue la decisión correcta? ¿Qué salió bien, qué salió mal?
```

## Gate Humano — Condicional

- **Documentación completa** *(todos los ADRs completados, README con setup funcional, runbook revisado)*: el agente avanza automáticamente y marca el ciclo como entregado: *"Documentación completa. ADRs publicados, README actualizado, runbook finalizado. Ciclo completado — issue cerrado."*
- **Con gaps**: el agente para y reporta: *"ADR-003 sin campo 'Consecuencias observadas'. ¿Lo completo yo con lo que observé durante la implementación, o tienes contexto adicional?"*

El cierre del ciclo es automático si todo está en orden. El humano solo interviene si hay un gap que requiere su perspectiva.
