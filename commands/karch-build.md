# karch-build — Full Feature Flow Orchestrator

## Purpose
Entry point for building a new feature. Runs the complete 11-phase SDD+BDD flow from a GitHub Issue to a deployed PR. Stops at human gates, advances automatically through conditional gates when there are no blockers.

## Usage
```
/karch-build #<issue-number>
/karch-build #123
```

## Gate map

| Phase | Gate type | Stops? |
|-------|-----------|--------|
| Phase 0 — Intake | Always-stop | ✋ Always |
| Phase 1 — SDD Spec | Conditional | Only if ambiguities found |
| Phase 2 — Risk Analysis | Conditional | Only if blocker found |
| Phase 3 — UX Design | Always-stop | ✋ Always (UI features) |
| Phase 3 — Architecture | Conditional | Only if deviating from playbook |
| Phase 4 — Task Breakdown | Conditional | Only if business priority ambiguity |
| Phase 5 — Implementation | Conditional | Only if scenario fails or off-spec decision |
| Phase 6 — Security | Conditional | Only if finding detected |
| Phase 7 — Testing | Conditional | Only if threshold not met |
| Phase 8 — Monitoring | Conditional | Only if operational decision needed |
| Phase 9 — CI/CD + PR | Always-stop | ✋ Always |
| Phase 10 — Documentation | Conditional | Only if gap found |

## Execution flow

### Phase 0 — Intake
Follow `/karch-phase-0` fully.
→ **STOP. Wait for human approval of scope before continuing.**

---

### Branch creation — immediately after Phase 0 approval

**Before touching any file**, create and switch to the feature branch:

```bash
# Ensure main is up to date
git checkout main && git pull origin main

# Create branch from main — naming convention: feat/NNN-short-description
git checkout -b feat/<NNN>-<short-description>

# If there are uncommitted changes on main (should not happen — flag this):
# git stash && git checkout -b feat/<NNN>-<short-description> && git stash pop
```

Branch naming:
- Features: `feat/<issue-number>-<kebab-case-description>`
- Bugs: `fix/<issue-number>-<kebab-case-description>`
- Example: `feat/42-home-page`, `fix/87-navbar-logo`

Report: *"Branch `feat/NNN-description` created from main. Starting Phase 1."*

> **Error signal**: if any file was already modified on `main` before this step — stash the changes, create the branch, pop the stash, and flag it to the human: *"Work started on main before branching — moved changes to `feat/NNN-description`. Please verify nothing was committed to main."*

---

### Phase 1 — SDD Spec
Follow `/karch-phase-1` fully.
- No ambiguities found → advance automatically, notify: *"Phase 1 complete. Spec at `specs/NNN/spec.md`. Advancing to Phase 2."*
- Ambiguities found → STOP, present questions, wait for answers, then continue.

---

### Phase 2 — Risk Analysis
Follow `/karch-phase-2` fully.
- No blockers → advance automatically, notify: *"Phase 2 complete. No blockers. Advancing to Phase 3."*
- Blocker found → STOP, present blocker with options, wait for decision, then continue.

---

### Phase 3 — Architecture & Design
Follow `/karch-phase-3` fully (UX first, then technical architecture).

**UX gate:**
→ **STOP. Present UX design and 7-criterion checklist. Wait for explicit approval.**

**Architecture gate (after UX approval):**
- Following playbook patterns → advance automatically.
- Deviating from playbook → STOP, present options, wait for decision, then continue.

---

### Phase 4 — Task Breakdown
Follow `/karch-phase-4` fully.
- No business priority ambiguity → advance automatically.
- Priority ambiguity between independent tasks → STOP, ask, then continue.

---

### Phase 5 — Implementation
Follow `/karch-phase-5` fully (RED → GREEN → REFACTOR per task).
- All scenarios green + regression OK → advance automatically.
- Scenario fails or off-spec decision made → STOP, report, wait for direction, then continue.

---

### Phase 6 — Security
Follow `/karch-phase-6` fully.
- All green → advance automatically, notify: *"Phase 6 complete. Security: all green. Advancing to Phase 7."*
- Finding detected → STOP, present finding + mitigation, wait for approval, then continue.

---

### Phase 7 — Testing
Follow `/karch-phase-7` fully.
- All thresholds met → advance automatically, notify: *"Phase 7 complete. Coverage: X%. Lighthouse: X/X. Advancing to Phase 8."*
- Threshold not met → STOP, report, wait for direction (fix or accept exception), then continue.

---

### Phase 8 — Monitoring
Follow `/karch-phase-8` fully.
- Configuration complete → advance automatically.
- Operational decision needed (alert channel, escalation contact) → STOP, ask, then continue.

---

### Phase 9 — CI/CD + PR
Follow `/karch-phase-9` fully. Open PR, run CI, get Vercel preview URL.
→ **STOP. Report: "PR #NNN opened. CI: ✅. Preview: [URL]. Review and tell me to merge or do it in GitHub."**
→ Wait for explicit human instruction to merge (or human does it directly in GitHub).

---

### Phase 10 — Documentation
Follow `/karch-phase-10` fully (after merge confirmed).
- All complete → close the issue and mark cycle as done: *"Cycle complete. Issue #NNN closed. All ADRs published, runbook finalized."*
- Gap found → STOP, report, wait for input, then finalize.

---

## Progress reporting

At each automatic phase transition, report in one line:
```
✅ Phase N complete — [key result]. Advancing to Phase N+1.
```

At each stop:
```
✋ Phase N — [reason for stopping]. [Question or decision needed].
```

## Error signals
- Issue number not provided: ask for it before starting
- `gh` CLI not available: ask the human to paste the issue description directly
- Scope approved but spec reveals major new functionality: STOP, flag scope creep, do not proceed without explicit approval
- At any phase, if 3 consecutive attempts fail to resolve a problem: STOP and escalate → *"I've tried 3 approaches and cannot resolve [X]. Please advise."*
