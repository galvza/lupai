---
phase: 8
slug: modo-completo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/unit/[file].test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/[changed-file].test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | MODO-01 | unit | `npx vitest run tests/unit/modo-completo-queries.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | MODO-02 | unit | `npx vitest run tests/unit/analyze-market-modo-completo.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | MODO-03 | unit | `npx vitest run tests/unit/synthesize-comparative.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | MODO-04 | unit | `npx vitest run tests/unit/synthesize-comparative.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/modo-completo-queries.test.ts` — stubs for MODO-01 (createCompetitor with role, getUserBusinessByAnalysis, getCompetitorsByAnalysis filtering)
- [ ] `tests/unit/analyze-market-modo-completo.test.ts` — stubs for MODO-02 (orchestrator user extraction flow, graceful degradation)
- [ ] `tests/unit/synthesize-comparative.test.ts` — stubs for MODO-03, MODO-04 (comparative synthesis output, prompt extension)
- [ ] `tests/fixtures/gemini-synthesis-comparative-v1.json` — fixture for comparative synthesis output
- [ ] Factory update: `createCompetitor` factory needs `role` field support

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| User URL accepted in input | MODO-01 | Frontend validation (Phase 9) | N/A — backend stores URL; frontend is Phase 9 |

*All phase behaviors that are backend-only have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
