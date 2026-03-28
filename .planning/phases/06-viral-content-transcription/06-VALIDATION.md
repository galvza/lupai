---
phase: 6
slug: viral-content-transcription
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-28
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-T1 | 06-01 | 1 | VIRL-01, VIRL-02, TRNS-01, TRNS-02 | type-check | `npx tsc --noEmit` | N/A (types/schemas) | ⬜ pending |
| 06-01-T2 | 06-01 | 1 | VIRL-01, TRNS-02 | type-check + JSON | `npx tsc --noEmit && node -e "...fixture parse..."` | N/A (prompts/fixtures) | ⬜ pending |
| 06-02-T1 | 06-02 | 2 | VIRL-01, TRNS-02 | unit | `npx vitest run tests/unit/tiktok-viral.test.ts tests/unit/instagram-viral.test.ts -x` | tests/unit/tiktok-viral.test.ts, tests/unit/instagram-viral.test.ts | ⬜ pending |
| 06-02-T2 | 06-02 | 2 | TRNS-02 | unit | `npx vitest run tests/unit/hbc-extraction.test.ts tests/unit/viral-patterns.test.ts -x` | tests/unit/hbc-extraction.test.ts, tests/unit/viral-patterns.test.ts | ⬜ pending |
| 06-03-T1 | 06-03 | 3 | VIRL-01, VIRL-02, VIRL-03, TRNS-01, TRNS-02, TRNS-03 | unit | `npx vitest run tests/unit/extract-viral.test.ts -x` | tests/unit/extract-viral.test.ts | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test files are created inline with their corresponding plan tasks (TDD pattern). No separate Wave 0 needed because:

- Plan 06-01 creates type foundations + fixtures (no tests needed — type-check verifies)
- Plan 06-02 Task 1 creates `tests/unit/tiktok-viral.test.ts` and `tests/unit/instagram-viral.test.ts` with tests as part of TDD
- Plan 06-02 Task 2 creates `tests/unit/hbc-extraction.test.ts` and `tests/unit/viral-patterns.test.ts` with tests as part of TDD
- Plan 06-03 Task 1 creates `tests/unit/extract-viral.test.ts` with tests as part of TDD

Fixture files created by Plan 06-01 Task 2:
- [x] `tests/fixtures/tiktok-viral.json` — TikTok hashtag scraper mock data (7 items with edge cases)
- [x] `tests/fixtures/instagram-viral.json` — Instagram hashtag scraper mock data (6 items with edge cases)
- [x] `tests/fixtures/hbc-extraction.json` — Gemini HBC extraction mock response
- [x] `tests/fixtures/viral-patterns.json` — Gemini cross-video patterns mock response

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Videos accessible via Bunny CDN URL | VIRL-02 | Requires real Bunny Storage account | Upload test file, verify CDN URL returns 200 |
| AssemblyAI transcription accuracy | TRNS-01 | Requires real API call | Submit known audio, verify text accuracy |
| Cross-video pattern quality | TRNS-02 | Requires AI output evaluation | Review Gemini pattern detection output for coherence |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (N/A — TDD creates tests inline)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
