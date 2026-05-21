# karch-fase-0 — Intake & Clarification

## Purpose
Read the incoming request (GitHub Issue or chat), disambiguate scope, priority and success criteria, and produce a documented initial scope approved by the human before any design or coding begins.

## Prior context required
A GitHub Issue number OR a chat description of the request.

## Steps

1. **Read the input**
   - From GitHub Issue: `gh issue view <number> --json title,body,labels,comments`
   - From chat: receive the description directly

2. **Process attached images** (if any in the Issue)
   ```bash
   # Extract image URLs
   gh issue view <number> --json body --jq '.body' | grep -oP 'https://[^\s"]+\.(png|jpg|jpeg|gif|webp)'
   # Download to temp dir OUTSIDE the repo
   mkdir -p /tmp/issue-<number>
   curl -L "<url>" -o /tmp/issue-<number>/img-1.png
   # Read the image visually, then immediately delete
   rm -rf /tmp/issue-<number>
   ```
   Rules: temp dir is always `/tmp/issue-<number>/`, never inside the repo. Delete in the same turn as reading.

3. **Create `scope-initial.md`** immediately with what can be inferred — mark assumptions explicitly:
   ```markdown
   # Scope: <issue title>
   **Issue:** #NNN
   **Date:** YYYY-MM-DD
   **Status:** In clarification | Ready for approval

   ## Scope
   ## Success Criteria
   ## Priority
   ## Assumptions
   - [ ] Assumption 1: ...
   ## Constraints and Dependencies
   ## Out of Scope
   ```

4. **Present clarification questions** — maximum 4 per round, always with concrete options (no open-ended questions), always include "Other":
   ```
   Question 1 — Scope
     What part of the flow is affected?
     a) Option A
     b) Option B
     c) Option C
     d) Other

   Question 2 — Priority
     What is the urgency?
     a) High — blocking users in production
     b) Medium — some users affected, workaround exists
     c) Low — experience improvement
     d) Other
   ```

5. **Update `scope-initial.md` immediately** after each human response — cross out confirmed assumptions, note what section was updated.

6. **Repeat rounds** until no relevant ambiguities remain. If something can be inferred with high confidence, assume it (document the assumption) — do not ask.

## Artifacts produced
| File | Description |
|------|-------------|
| `.specify/scope-initial.md` | Living scope document — updated in each clarification round |

## Gate
> "This is the proposed scope. Do you approve it or should we adjust anything?"

**ALWAYS-STOP gate** — never advance to Phase 1 without explicit human approval.

## Error signals
- Issue not found: ask the human to paste the description directly
- Image URL expired: ask the human to attach the image under `specs/NNN/assets/`
- Scope too broad after 2 rounds: propose splitting into multiple issues
