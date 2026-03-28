---
phase: 9
slug: dashboard-results-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | DASH-01 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | DASH-03 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | DASH-02 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | DASH-04 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 09-03-02 | 03 | 2 | DASH-05 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for API routes (`GET /api/analysis/[id]`, `GET /api/analysis/[id]/status`)
- [ ] Test stubs for section status derivation logic
- [ ] Fixtures for aggregated analysis response shapes

*Existing test infrastructure (vitest, testing-library) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive layout 375px+ | DASH-04 | Visual layout verification | Open dashboard at 375px, 768px, 1280px viewport widths |
| PT-BR text rendering | DASH-05 | Visual text display | Verify all labels, headings, and AI content render in Portuguese |
| Real-time progress animation | DASH-02 | Live Trigger.dev subscription | Start analysis, observe step-by-step progress indicators |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
