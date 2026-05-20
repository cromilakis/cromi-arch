# Fase 10: Documentación

**Propósito:** Documentar todo el proyecto **al final**, después de iterar. Esto evita documentar código que aún va a cambiar.

## Actividades

- ADRs retrospectivos de decisiones clave tomadas durante el desarrollo
- README.md con instrucciones de setup
- Feature files como **living documentation** (los tests BDD son la documentación viva)
- Runbook con procedimientos de: deploy, debug, monitoreo
- Documentación de API endpoints

## Artefactos

| Archivo | Descripción |
|---|---|
| `docs/` | Documentación completa del proyecto |
| `docs/adr/` | Architecture Decision Records |
| `README.md` | Setup y guía de inicio rápido |

## ADRs recomendados

```
docs/adr/
├── adr-001-stack-tecnologico.md
├── adr-002-bdd-playwright.md
├── adr-003-error-handling.md
└── adr-004-testing-strategy.md
```

## Gate Humano

> "Documentación completa en docs/. ¿Revisas?"

✅ El humano revisa la documentación antes de finalizar el ciclo.
