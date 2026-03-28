---
phase: 5
slug: ads-intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/unit/extract-ads.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/extract-ads.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | ADS-01 | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "meta ads"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | GADS-01 | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "google ads"` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | GMB-01 | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "gmb"` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | D-15 | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "paralelo"` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | D-22 | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "fallback"` | ❌ W0 | ⬜ pending |
| 05-01-06 | 01 | 1 | D-27 | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "validacao"` | ❌ W0 | ⬜ pending |
| 05-01-07 | 01 | 1 | D-32 | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "nunca"` | ❌ W0 | ⬜ pending |
| 05-01-08 | 01 | 1 | D-17 | unit | `npx vitest run tests/unit/extract-ads.test.ts -t "supabase"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/extract-ads.test.ts` — stubs for ADS-01, GADS-01, GMB-01, D-15, D-22, D-27, D-32, D-17
- [ ] Zod schemas for MetaAdsData, GoogleAdsData, GmbData validation

*Existing test infrastructure (vitest.config.ts, test fixtures) covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ADS-02: Meta ads display | ADS-02 | Frontend — skipped per backend-only feedback | N/A — deferred to frontend phase |
| GADS-02: Google Ads display | GADS-02 | Frontend — skipped per backend-only feedback | N/A — deferred to frontend phase |
| GMB-02: GMB data display | GMB-02 | Frontend — skipped per backend-only feedback | N/A — deferred to frontend phase |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
