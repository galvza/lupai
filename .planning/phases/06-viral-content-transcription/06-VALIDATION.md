---
phase: 6
slug: viral-content-transcription
status: draft
nyquist_compliant: false
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
| TBD | TBD | TBD | VIRL-01 | unit+integration | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | VIRL-02 | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TRNS-01 | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TRNS-02 | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/viral-discovery.test.ts` — stubs for VIRL-01 (viral content discovery)
- [ ] `tests/unit/bunny-pipeline.test.ts` — stubs for VIRL-02 (video download + upload)
- [ ] `tests/unit/transcription.test.ts` — stubs for TRNS-01 (AssemblyAI transcription)
- [ ] `tests/unit/hbc-extraction.test.ts` — stubs for TRNS-02 (hook/body/CTA analysis)
- [ ] `tests/fixtures/viral-tiktok.json` — TikTok viral search mock data
- [ ] `tests/fixtures/viral-instagram.json` — Instagram Reels search mock data

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Videos accessible via Bunny CDN URL | VIRL-02 | Requires real Bunny Storage account | Upload test file, verify CDN URL returns 200 |
| AssemblyAI transcription accuracy | TRNS-01 | Requires real API call | Submit known audio, verify text accuracy |
| Cross-video pattern quality | TRNS-02 | Requires AI output evaluation | Review Gemini pattern detection output for coherence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
