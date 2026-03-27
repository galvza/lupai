---
phase: 3
slug: competitor-discovery-orchestration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | COMP-01 | unit | `npx vitest run tests/unit/discover-competitors.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | -- | unit | `npx vitest run tests/unit/blocklist.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | -- | unit | `npx vitest run tests/unit/score-competitors.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | -- | unit | `npx vitest run tests/unit/google-search-wrapper.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | ORCH-01 | unit | `npx vitest run tests/unit/analyze-market.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | ORCH-02 | unit | `npx vitest run tests/unit/fan-out-independence.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | COMP-02, COMP-03 | unit | `npx vitest run tests/unit/confirm-competitors-route.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | -- | unit | `npx vitest run tests/unit/orchestrator-metadata.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/discover-competitors.test.ts` — discovery pipeline with mocked Apify actors (COMP-01)
- [ ] `tests/unit/blocklist.test.ts` — domain blocklist filtering and deduplication
- [ ] `tests/unit/score-competitors.test.ts` — Gemini scoring with mocked AI responses
- [ ] `tests/unit/google-search-wrapper.test.ts` — Google Search Apify wrapper output filtering
- [ ] `tests/unit/confirm-competitors-route.test.ts` — confirmation API route (COMP-02, COMP-03)
- [ ] `tests/unit/analyze-market.test.ts` — orchestrator flow with mocked sub-tasks (ORCH-01)
- [ ] `tests/unit/fan-out-independence.test.ts` — sub-task independence (ORCH-02)
- [ ] `tests/fixtures/google-search.json` — fixture data for Google Search actor output
- [ ] `tests/fixtures/gemini-score-competitors.json` — fixture data for Gemini scoring response

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-time metadata updates visible | ORCH-01 | Requires Trigger.dev runtime + frontend subscription | Run orchestrator with `npx trigger dev`, verify metadata.set() calls update in Trigger.dev dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
