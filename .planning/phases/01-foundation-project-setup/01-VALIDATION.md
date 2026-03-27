---
phase: 1
slug: foundation-project-setup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts (Wave 0 installs) |
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
| TBD | TBD | TBD | FOUND-01 | build | `npm run build` | N/A | ⬜ pending |
| TBD | TBD | TBD | FOUND-02 | integration | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FOUND-03 | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FOUND-04 | typecheck | `npm run typecheck` | N/A | ⬜ pending |
| TBD | TBD | TBD | FOUND-05 | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FOUND-06 | manual | check .env.example | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration
- [ ] `tests/unit/` — unit test directory structure
- [ ] `tests/integration/` — integration test directory
- [ ] `tests/fixtures/` — fixture data directory

*Test infrastructure must be created as part of Phase 1 scaffolding.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| npm run dev starts app | FOUND-01 | Dev server startup | Run `npm run dev`, verify localhost:3000 loads |
| .env.example complete | FOUND-06 | File content check | Verify all env vars listed with descriptions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
