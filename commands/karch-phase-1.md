# karch-phase-1 — SDD Specification

## Purpose
Transform the approved scope into a formal Software Design Document (SDD Spec). This is the written contract of what will be built — not a plan for how to build it.

## Prior context required
- `.specify/scope-initial.md` approved in Phase 0
- Issue number (NNN) for folder naming

## Steps

> **Prerequisito**: spec-kit debe estar instalado. Se instala automáticamente con `npx kromi-arch install`. Si no está disponible, detener y ejecutar: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`

### 1. Generar el spec con spec-kit

```
/speckit.constitution <topic>   ← solo si no existe aún en el proyecto
/speckit.specify <description>  ← genera specs/NNN-feature/spec.md
```

Usar el scope aprobado en Phase 0 (`.specify/scope-initial.md`) como input de `/speckit.specify`.

### 2. Resolver marcadores `[NEEDS CLARIFICATION]`
```
/speckit.clarify
```
- No avanzar con ningún marcador pendiente
- Presentar preguntas al humano en rondas de máximo 4, con opciones concretas

### 3. Verificar cobertura del spec
- Todas las funcionalidades del scope aprobado en Phase 0
- Casos de error y edge cases identificados
- Criterios de aceptación explícitos para cada FR
- Inputs y outputs definidos por flujo

### 4. Escribir ADR borrador si el spec implica una decisión arquitectónica nueva
   (ADRs se escriben cuando se toma la decisión, no al final)

## Artifacts produced
| File | Description |
|------|-------------|
| `specs/NNN-feature/spec.md` | Formal feature specification |
| `docs/adr/adr-NNN-*.md` | Draft ADR (if a new architectural decision was made) |

## Gate
**Conditional gate — evaluate before stopping:**

- **Spec without ambiguities** (no `[NEEDS CLARIFICATION]`, covers all success criteria from scope): advance automatically → *"Spec generated at `specs/NNN-feature/spec.md`. Formalizes approved scope with no new open questions. Advancing to Phase 2."*
- **Spec with ambiguities** (contains `[NEEDS CLARIFICATION]` or reveals edge cases not in scope): stop and present questions using Phase 0 protocol (options, max 4 per round) → *"The spec reveals [N] undefined points. How should we resolve them?"*

## Error signals
- Spec contradicts approved scope: stop, highlight the contradiction, ask the human to decide
- Spec scope creep detected (new functionality not in scope-initial.md): flag it explicitly → *"The spec includes [X] which was not in the approved scope. Include it or keep it out of scope?"*
