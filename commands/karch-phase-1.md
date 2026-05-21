# karch-phase-1 — SDD Specification

## Purpose
Transform the approved scope into a formal Software Design Document (SDD Spec). This is the written contract of what will be built — not a plan for how to build it.

## Prior context required
- `.specify/scope-initial.md` approved in Phase 0
- Issue number (NNN) for folder naming

## Steps

1. **Check if a project constitution exists**
   - If not: run `/speckit.constitution <topic>` to create the project-level constitution
   - The constitution captures long-term context: team, domain, constraints, non-goals

2. **Generate the spec**
   Run `/speckit.specify <description>` using the approved scope as input.
   The spec is created at `specs/NNN-feature/spec.md`.

3. **Check for `[NEEDS CLARIFICATION]` markers**
   - If found: run `/speckit.clarify` and resolve each marker
   - Do not advance with unresolved markers

4. **Verify the spec covers**
   - All main functionalities from the approved scope
   - Known edge cases and error paths
   - Implicit acceptance criteria (what "done" looks like)
   - Data inputs and outputs for each flow

5. **Write draft ADR** if the spec implies a new architectural decision not covered by the playbook
   (ADRs are written when the decision is made, not at the end)

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
