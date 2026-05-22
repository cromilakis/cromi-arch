# karch-phase-4 — BDD Task Breakdown

## Purpose
Decompose the specification into atomic, executable tasks. Each task follows the order: Feature File (Gherkin) → Step Definitions → Implementation code. Tasks are defined here so Phase 5 is pure execution with no design decisions.

## Prior context required
- `docs/architecture.md` from Phase 3
- `specs/NNN-feature/contracts/` from Phase 3
- Approved UX flows from `docs/ux/user-flows.md`

## Steps

1. **List all tasks** derived from the spec and architecture
   Each task must be atomic: one feature file, one clear behavior, one commit.

2. **For each task, define:**
   ```
   Task T-N: <short name>
   Feature file: features/<domain>/<name>.feature
   Scenarios:
     - Scenario A: <happy path>
     - Scenario B: <error case>
     - Scenario C: <edge case>
   Depends on: T-M (if any)
   Parallelizable: yes/no
   ```

3. **Mark parallelizable tasks with `[P]`**
   Tasks with no dependency between them can run in parallel sessions.

4. **Define task order** by technical dependencies, not arbitrary sequence:
   - Tasks that create DB tables before tasks that query them
   - API endpoints before UI components that call them
   - Auth middleware before protected routes

5. **Write `specs/NNN-feature/tasks.md`** with the complete ordered list

### Example task list format
```markdown
# Tasks: NNN — Feature Name

## T-01: User registration API [P]
Feature: features/auth/registration.feature
Scenarios: success, duplicate email, invalid password
Depends on: —

## T-02: Registration form UI
Feature: features/auth/registration-ui.feature
Scenarios: form renders, validation errors shown, success redirect
Depends on: T-01

## T-03: Email verification [P]
Feature: features/auth/email-verification.feature
Scenarios: valid token, expired token, already verified
Depends on: T-01
```

## Artifacts produced
| File | Description |
|------|-------------|
| `specs/NNN-feature/tasks.md` | Ordered task list with dependencies and parallelization markers |

## Gate
**Conditional gate:**

- **No external constraints**: advance automatically → *"Tasks ordered in `tasks.md`. Will execute in the proposed order — let me know if you have any priority constraints."*
- **Business priority ambiguity** (two technically independent tasks with different business impact): stop and ask → *"Tasks T-02 and T-03 are technically independent. Which has higher priority for you?"*

The human does not need to order tasks — only confirm or adjust if they have business context the agent lacks.

## Error signals
- Task too large (more than 3 scenarios or touches more than 2 system layers): split into subtasks
- Circular dependency detected: restructure tasks to break the cycle
- Scenario not traceable to an approved requirement in spec.md: flag and clarify before proceeding
