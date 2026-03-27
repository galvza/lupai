---
phase: 2
slug: input-ai-understanding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (exists from Phase 1) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | INPT-02 | unit | `npx vitest run tests/unit/classify.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | INPT-02 | unit | `npx vitest run tests/unit/understand-route.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | ORCH-03 | unit | `npx vitest run tests/unit/analyze-route.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | INPT-01 | unit (component) | `npx vitest run tests/unit/NicheInput.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | INPT-03, INPT-04 | unit (component) | `npx vitest run tests/unit/ConfirmationCard.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | D-19, D-24 | unit | `npx vitest run tests/unit/classify.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/classify.test.ts` — classifyInput() for all 5 input categories (INPT-02, D-19)
- [ ] `tests/unit/understand-route.test.ts` — POST /api/analyze/understand route with mocked Gemini (INPT-02, D-24)
- [ ] `tests/unit/analyze-route.test.ts` — POST /api/analyze route with mocked Supabase + Trigger.dev (ORCH-03)
- [ ] `tests/unit/NicheInput.test.tsx` — textarea rendering, placeholder rotation (INPT-01) — needs `// @vitest-environment jsdom`
- [ ] `tests/unit/ConfirmationCard.test.tsx` — renders confirmation, editable fields update state (INPT-03, INPT-04) — needs `// @vitest-environment jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rotating placeholder animation | D-27 | CSS animation timing not reliably testable | Open homepage, verify placeholder text cycles every 3-4s |
| Helper chips pre-fill input | D-28 | Requires click interaction in real browser | Click each chip, verify input pre-fills correctly |
| First-time banner shows/dismisses | D-30 | localStorage persistence across sessions | Open in incognito, verify banner, dismiss, reload, verify gone |
| Redirect to /analysis/[id] after confirmation | D-10 | Next.js router behavior | Submit, confirm, verify URL changes to /analysis/uuid |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
