# Phase 1: Foundation & Project Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 01-Foundation & Project Setup
**Mode:** auto (all decisions auto-selected with recommended defaults)
**Areas discussed:** Project Scaffolding, Database Schema Design, Service Client Patterns, Fixture/Mock Strategy

---

## Project Scaffolding

| Option | Description | Selected |
|--------|-------------|----------|
| create-next-app + manual Tailwind v4 | Standard scaffolding, add deps incrementally | ✓ |
| Manual setup from scratch | Full control, more error-prone | |

**User's choice:** [auto] create-next-app with TypeScript + Tailwind v4 (recommended default)
**Notes:** Versions pinned per research: Next.js 15.5.x, React 19.x, TS 5.7.x, Tailwind 4.1.x, Zod 3.24.x

---

## Database Schema Design

| Option | Description | Selected |
|--------|-------------|----------|
| JSONB columns for flexible data | Accommodates varying Apify actor outputs | ✓ |
| Strict column-per-field | More type safety at DB level, brittle when actors change | |

**User's choice:** [auto] JSONB columns for extraction data (recommended default)
**Notes:** 4 tables: analyses (root), competitors, viral_content, synthesis. All linked by analysis_id FK.

---

## Service Client Patterns

| Option | Description | Selected |
|--------|-------------|----------|
| Thin function wrappers per service | Simple, typed, easy to test | ✓ |
| Class-based service clients | More OOP, heavier abstraction | |
| Shared base client with inheritance | DRY but over-engineered for MVP | |

**User's choice:** [auto] Thin function wrappers in lib/ per service (recommended default)
**Notes:** Each service in its own directory under lib/, exports typed async functions.

---

## Fixture/Mock Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| JSON fixtures + factory functions | Typed, overridable, matches filtered output format | ✓ |
| MSW (Mock Service Worker) | Intercepts HTTP, more realistic but heavier setup | |
| Inline mocks in each test | Quick but duplicative, hard to maintain | |

**User's choice:** [auto] JSON fixtures with factory functions (recommended default)
**Notes:** Critical due to Apify $5/month free tier — must develop with fixtures, reserve credits for demo.

---

## Claude's Discretion

- RLS policies, index selection, Tailwind v4 CSS details, Trigger.dev config, Vitest config

## Deferred Ideas

None — analysis stayed within phase scope
