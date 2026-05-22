# karch-phase-1 — SDD Specification

## Purpose
Transform the approved scope into a formal Software Design Document (SDD Spec). This is the written contract of what will be built — not a plan for how to build it.

## Prior context required
- `.specify/scope-initial.md` approved in Phase 0
- Issue number (NNN) for folder naming

## Steps

### 1. Generar el spec

**Opción A — speckit disponible** (verificar con `ls .claude/commands/ | grep speckit`):
```
/speckit.constitution <topic>   ← solo si no existe aún
/speckit.specify <description>  ← genera specs/NNN-feature/spec.md
```

**Opción B — speckit no disponible** (default cuando no está instalado):
Generar `specs/NNN-feature/spec.md` directamente con esta estructura:

```markdown
# Spec: NNN — <Feature name>

## Context
<Why this feature exists and what problem it solves>

## Scope (from approved Phase 0)
<Exact scope approved in .specify/scope-initial.md>

## Out of scope
<What explicitly will NOT be built in this iteration>

## Actors
- <Actor 1>: <role and permissions>
- <Actor 2>: <role and permissions>

## Functional requirements
### FR-01: <Requirement name>
- Description: <what the system must do>
- Input: <data received>
- Output: <data returned or state change>
- Acceptance criteria:
  - Given <precondition>, when <action>, then <result>
  - Given <precondition>, when <error condition>, then <error result>

### FR-02: ...

## Non-functional requirements
- Performance: <response time, load expectations>
- Security: <auth required, data sensitivity>
- Accessibility: WCAG 2.1 AA

## Edge cases and error paths
- <Edge case 1>: <expected behavior>
- <Edge case 2>: <expected behavior>

## Open questions
- [NEEDS CLARIFICATION] <question> ← mark any undefined point
```

### 2. Resolver marcadores `[NEEDS CLARIFICATION]`
- Si el spec contiene marcadores sin resolver: detener y presentar las preguntas al humano (máximo 4 por ronda, con opciones)
- No avanzar con ningún marcador pendiente

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
