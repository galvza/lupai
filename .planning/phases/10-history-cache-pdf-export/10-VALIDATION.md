---
phase: 10
slug: history-cache-pdf-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/{changed-test}.test.ts -x`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | HIST-01 | unit | `npx vitest run tests/unit/cache-check.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | HIST-04 | unit | `npx vitest run tests/unit/cache-check.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | HIST-02 | unit | `npx vitest run tests/unit/history-route.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | HIST-03 | unit | `npx vitest run tests/unit/analysis-results-route.test.ts -x` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 1 | PDF-01 | unit | `npx vitest run tests/unit/pdf-generate.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | PDF-02 | unit | `npx vitest run tests/unit/pdf-generate.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 1 | PDF-03 | unit | `npx vitest run tests/unit/pdf-generate.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-02-04 | 02 | 1 | PDF-01 | unit | `npx vitest run tests/unit/pdf-route.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/cache-check.test.ts` — stubs for HIST-01, HIST-04 (cache matching and 24h window)
- [ ] `tests/unit/history-route.test.ts` — stubs for HIST-02 (history API pagination)
- [ ] `tests/unit/pdf-generate.test.ts` — stubs for PDF-01, PDF-02, PDF-03 (PDF generation)
- [ ] `tests/unit/pdf-route.test.ts` — stubs for PDF-01 (route handler level)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF visual layout quality | PDF-02 | Visual inspection of typography, spacing, sections | Open generated PDF, verify all sections present, text readable, cover page has branding |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
