---
phase: 4
slug: website-seo-social-extraction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | SITE-01 | unit+integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SEO-01 | unit+integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SOCL-01 | unit+integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SOCL-02 | unit+integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/extract-website.test.ts` — stubs for SITE-01, website scraping + social link extraction
- [ ] `tests/unit/extract-social.test.ts` — stubs for SOCL-01, SOCL-02
- [ ] `tests/unit/social-links.test.ts` — stubs for social link regex extraction utility
- [ ] `tests/fixtures/website-html.json` — fixture with social links in footer/header
- [ ] `tests/fixtures/similarweb-response.json` — fixture for SEO data (if not already present)

*Existing infrastructure covers vitest setup and Apify mock patterns from Phase 1/3.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual Apify actor responses match expected schema | SITE-01, SEO-01, SOCL-02 | Requires live API calls | Run with real Apify token against known competitor URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
