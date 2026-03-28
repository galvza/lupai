---
phase: 7
slug: ai-synthesis-creative-modeling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x (installed) |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run tests/unit/synthesize-ai.test.ts tests/unit/creative-ai.test.ts tests/unit/synthesize-task.test.ts --reporter verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/synthesize-ai.test.ts tests/unit/creative-ai.test.ts tests/unit/synthesize-task.test.ts --reporter verbose`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SYNTH-01 | unit | `npx vitest run tests/unit/synthesize-ai.test.ts -x` | Wave 0 | pending |
| 07-01-02 | 01 | 1 | SYNTH-02 | unit | `npx vitest run tests/unit/synthesize-ai.test.ts -t "recomendacoes especificas" -x` | Wave 0 | pending |
| 07-01-03 | 01 | 1 | CRTV-01 | unit | `npx vitest run tests/unit/creative-ai.test.ts -x` | Wave 0 | pending |
| 07-01-04 | 01 | 1 | CRTV-02 | unit | `npx vitest run tests/unit/creative-ai.test.ts -t "padroes virais" -x` | Wave 0 | pending |
| 07-01-05 | 01 | 1 | CRTV-03 | unit | `npx vitest run tests/unit/creative-ai.test.ts -t "formato e duracao" -x` | Wave 0 | pending |
| 07-02-01 | 02 | 2 | SYNTH-03 | unit | `npx vitest run tests/unit/synthesize-task.test.ts -t "armazena sintese" -x` | Wave 0 | pending |
| 07-02-02 | 02 | 2 | CRTV-04 | unit | `npx vitest run tests/unit/synthesize-task.test.ts -t "armazena roteiros" -x` | Wave 0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/synthesize-ai.test.ts` — stubs for SYNTH-01, SYNTH-02
- [ ] `tests/unit/creative-ai.test.ts` — stubs for CRTV-01, CRTV-02, CRTV-03
- [ ] `tests/unit/synthesize-task.test.ts` — stubs for SYNTH-03, CRTV-04
- [ ] `tests/fixtures/gemini-synthesis-v2.json` — updated fixture matching D-02 section format
- [ ] `tests/fixtures/gemini-creative-v2.json` — updated fixture matching D-12 script format

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gemini produces non-generic recommendations with real data references | SYNTH-02 | Output quality depends on real scraped data + Gemini reasoning | Run with real competitor data, verify recommendations cite specific competitor names and numbers |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
