# karch-phase-3 — Architecture & Design

## Purpose
Design the complete technical architecture: API, database schema, React components, cross-cutting strategies — and get the UX/visual design approved **before writing a single line of code**.

## Prior context required
- `docs/threat-model.md` and `docs/data-analysis.md` from Phase 2
- `specs/NNN-feature/spec.md` from Phase 1

## Steps

### Part A — UX Design (always first, before technical architecture)

1. Create wireframes or mockups for every screen involved
2. Document the user flow: happy path + minimum 2 edge cases
3. Define the **5 states** for each screen:
   - `loading` — skeleton or spinner
   - `empty` — empty state with call to action
   - `error` — recoverable error + retry
   - `success` — happy path result
   - `edge case` — boundary conditions (no results, max items, etc.)
4. Verify colors and typography use existing design tokens — no hardcoded values
5. Decompose each screen into components — no raw HTML elements allowed
6. Mark each component as **Server Component** or **Client Component**
7. Define responsive breakpoints: mobile-first, `sm/md/lg`
8. All visible text uses i18n keys — no hardcoded strings

**UX Approval Checklist (all 7 must pass before proceeding):**
| # | Criterion |
|---|-----------|
| 1 | Every screen has all 5 states designed |
| 2 | No raw HTML — everything is a component |
| 3 | Colors and typography from design tokens only |
| 4 | User flow documented: happy path + ≥ 2 edge cases |
| 5 | Every component labeled Server or Client |
| 6 | Mobile-first, breakpoints `sm/md/lg` specified |
| 7 | All visible text uses i18n keys |

### Part B — Technical Architecture (only after UX is approved)

1. **API design** — Next.js Route Handlers
   - Define endpoints: method, path, auth required, rate limit tier
   - Write request/response contracts in `specs/NNN-feature/contracts/`
   - Apply: Zod validation on all inputs, `{ data }` / `{ error, code }` response format

2. **Database schema** — Prisma
   - Write schema additions based on Phase 2 data analysis
   - Apply expand-contract pattern for any migration needed
   - Add indexes identified in Phase 2

3. **Component architecture** — aligned with approved mockups
   - Map mockup components to file paths in `src/`
   - Confirm Server vs Client boundary decisions
   - For each component: verify it exists in the playground or add "create in playground" as a task in Phase 4
   - See `/karch-playground` for the playground-first rule — no HTML native elements in pages

4. **Cross-cutting strategies**
   - Auth: Auth.js v5 session check pattern (`const session = await auth()`)
   - BOLA: ownership check per resource
   - Error handling: Error Boundary + TanStack Query + Sentry
   - Server state: TanStack Query (queries + mutations)
   - Validation: Zod at every API boundary
   - i18n: next-intl keys

5. **Write draft ADRs** for every non-trivial architectural decision made here

   A decision is non-trivial if it meets any of these criteria:
   - Introduces or configures a routing strategy (e.g., `[locale]` segment, parallel routes)
   - Extends or deviates from an existing playbook pattern (e.g., custom Button variant strategy)
   - Has non-obvious consequences on other parts of the codebase (e.g., middleware chain order)
   - Chooses between two or more valid alternatives

   Each ADR must be created as a file in `docs/adr/` before Gate B. The ADR template:
   ```markdown
   # ADR-NNN: <title>
   Status: Draft
   Date: YYYY-MM-DD

   ## Context
   <What situation or constraint led to this decision>

   ## Decision
   <What was decided>

   ## Consequences
   <What becomes easier, what becomes harder, what must be updated elsewhere>
   ```

## Artifacts produced
| File | Description |
|------|-------------|
| `docs/ux/wireframes/` | Wireframes or mockups (PNG, Figma export, or Pencil) |
| `docs/ux/user-flows.md` | User flows with states and transitions |
| `docs/architecture.md` | Complete technical architecture document |
| `specs/NNN-feature/contracts/` | API contracts (request/response per endpoint) |
| `docs/adr/adr-NNN-*.md` | Draft ADRs for architectural decisions |

## Gate

> Antes de evaluar el gate: ejecutar `/karch-checklist phase=3 issue="<título>"` y resolver todos los items fallidos.

**Two gate moments — both are ALWAYS-STOP for features with UI:**

**Gate A — UX Design**
> "UX design in `docs/ux/`. All 7 checklist criteria met. Do you approve the flows and screens?"
→ Wait for explicit approval before designing the technical architecture.

**Gate B — Technical Architecture** (conditional)

Before evaluating, verify:
- [ ] At least one draft ADR exists in `docs/adr/` for each non-trivial decision taken in this phase
- [ ] `docs/architecture.md` is written

Then:
- **Following playbook patterns AND ADRs produced for non-trivial decisions**: advance automatically → *"Architecture in `docs/architecture.md`. ADRs written: [list]. Advancing to Phase 4."*
- **Deviating from playbook** (new library, undefined pattern, schema decision with non-obvious consequences): stop and present options → *"For [X] there is no defined pattern in the playbook. Options: [A] / [B]. Which do you prefer?"*
- **Non-trivial decision taken but no ADR written**: stop → *"Decision [X] was made but no ADR was created. Writing ADR-NNN now before advancing."*

For backend-only features: only Gate B applies.

## Error signals
- UX gate skipped for UI features: stop, do not proceed to technical architecture
- New dependency required not in `package.json`: flag it, get approval before adding
- Schema change without expand-contract plan: flag as blocker
