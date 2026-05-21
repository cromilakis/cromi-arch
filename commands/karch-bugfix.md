# karch-bugfix — Bug Fix (Short Flow)

## Purpose
Fix a bug or minor change using a 5-phase flow (0→5→6→7→9). Skips spec, risk analysis, architecture, task breakdown and monitoring phases — the scope is narrow and the fix is a single atomic task.

## When to use this flow vs the full 11-phase flow

| Criterion | Use karch-bugfix | Use full flow |
|-----------|-----------------|---------------|
| Bug reported (label `bug`) | ✅ | — |
| Copy or translation change | ✅ | — |
| Minor visual adjustment (spacing, color) | ✅ | — |
| New feature or behavior | — | ✅ |
| Change affecting the data model | — | ✅ |
| Change affecting architecture | — | ✅ |
| Non-trivial security implications | — | ✅ |

**When in doubt, use the full 11-phase flow.**

---

## Phase 0 — Bug Intake

1. Read the issue:
   ```bash
   gh issue view <number> --json title,body,labels,comments
   ```
2. Download attached images if any (temp dir protocol):
   ```bash
   mkdir -p /tmp/issue-<number>
   curl -L "<url>" -o /tmp/issue-<number>/img-1.png
   # Read image, then immediately:
   rm -rf /tmp/issue-<number>
   ```
3. **Reproduce the bug locally** before confirming scope — do not claim to understand a bug you have not reproduced.
4. Confirm with the human:
   > "The bug is [description]. The fix involves [module/file]. Shall I proceed?"

**ALWAYS-STOP gate** — the human confirms scope before touching any code.

---

## Phase 5 — Fix Implementation (RED → GREEN → REFACTOR)

1. **RED**: write a test that reproduces the bug and fails
   ```bash
   npx vitest run --grep "<test name>"   # must FAIL
   ```
   This test is the most important artifact of the fix — it prevents regression.

2. **GREEN**: implement the minimal fix that makes the test pass
   - Fix only what is broken — do not refactor adjacent code
   - Apply the same auth/BOLA/Zod patterns as the full flow

3. **REFACTOR**: clean up if needed — the test must stay green throughout

4. **Full regression**:
   ```bash
   npm test   # 100% green before committing
   ```

5. **Commit**:
   ```bash
   git commit -m "fix(<scope>): <concise description>

   Closes #<NNN>"
   ```
   One commit per fix. Reference the issue. No mixed purposes.

---

## Phase 6 — Security (automatic)

Run on all files touched by the fix:
```bash
npx semgrep --config=auto --error
npm audit --audit-level=high
```

- **All green**: continue automatically.
- **Finding in touched code**: stop and present it → *"Security finding in [file]: [description]. Proposed mitigation: [X]. Approve?"*

---

## Phase 7 — Testing (automatic)

```bash
npx vitest run --coverage   # coverage must not drop vs pre-fix baseline
npx playwright test          # if fix touches UI or API endpoints
```

- **All green, coverage not dropped**: continue automatically.
- **Test broken or coverage dropped**: stop and report → *"[Test name] is now failing. Cause: [description]. Fix the test or adjust the implementation?"*

---

## Phase 9 — PR and Preview

1. Open the PR:
   ```bash
   gh pr create \
     --title "fix: <description>" \
     --body "Closes #<NNN>

   ## Root cause
   [What caused the bug]

   ## Fix
   [What was changed and why]

   ## Testing
   - Added test that reproduces the bug (RED → GREEN verified)
   - Full regression: ✅" \
     --base main
   ```

2. Report to the human:
   > "PR #NNN opened. CI: ✅. Preview: [Vercel URL]. Review the fix and tell me if I should merge or you'll do it in GitHub."

**ALWAYS-STOP gate** — the human reviews the preview. Merge is done by the human in GitHub or on explicit instruction to the agent.

---

## What this flow does NOT do

| Skipped phase | Why |
|---------------|-----|
| Phase 1 — SDD Spec | A bug does not require formal specification |
| Phase 2 — Risk Analysis | Scope is narrow; threat model adds no value here |
| Phase 3 — Architecture | No architectural decisions in a fix |
| Phase 4 — Task Breakdown | The fix is a single atomic task |
| Phase 8 — Monitoring | Monitoring already exists; the fix does not change infrastructure |
| Phase 10 — Documentation | The commit message + closed issue is sufficient documentation |

## Escalation rule
If during the fix you discover the bug has an architectural or non-trivial security root cause → **escalate to the full 11-phase flow**. Inform the human before proceeding.
