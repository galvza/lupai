# Phase 6: Viral Content & Transcription - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-03-28
**Phase:** 06-viral-content-transcription
**Mode:** auto (discuss workflow)
**Areas analyzed:** Viral Discovery Strategy, Video Download Pipeline, Transcription Flow, Per-Video HBC Extraction, Cross-Video Pattern Detection, Task Structure

---

## User-Provided Context (Pre-Discussion)

The user provided extensive Phase 6 context BEFORE invoking the discuss command:

> - TikTok + Instagram Reels ONLY (no Facebook for MVP)
> - Top 10 viral videos per niche, last 30 days, sorted by engagement rate
> - Top 5 from each platform = 10 total
> - MAX 4 minutes per video — discard anything longer
> - Transcribe all 10 via Assembly AI
> - Videos must be downloaded to Bunny Storage first, then Bunny URL sent to Assembly AI
> - CROSS-VIDEO PATTERN DETECTION — send all 10 transcriptions to Gemini in a SINGLE batch
> - Hook patterns (first 3 seconds), Body structure, CTA patterns, Dominant tone, Average duration, Recurring formulas
> - Generate 2-3 suggested video scripts adapted to user's business
> - Each script has: hook (with timing), body structure, CTA
> - Viral search is INDEPENDENT of competitors — searches the entire niche, any creator

These match the decisions previously captured in memory (`project_future_phase_decisions.md`).

---

## Viral Discovery Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| New hashtag/trend Apify actors | Dedicated actors for niche-wide viral search (not profile scrapers) | ✓ |
| Reuse existing profile scrapers | Use scrapeInstagram/scrapeTiktok with broader queries | |

**Auto-selected:** New hashtag/trend Apify actors (recommended — existing wrappers take usernames, not hashtags/keywords)
**Notes:** Existing `scrapeInstagram()` and `scrapeTiktok()` are profile-based. Viral discovery needs hashtag/trend/keyword search actors — fundamentally different API calls.

---

## Video Download Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Download in Trigger.dev task → Bunny | fetch() → Buffer → uploadFile() within extract-viral task | ✓ |
| Direct URL to AssemblyAI | Skip Bunny, send platform URLs directly | |

**Auto-selected:** Download in Trigger.dev task → Bunny (recommended — user explicitly specified this; platform URLs are temporary/protected)
**Notes:** User-specified requirement. TikTok/Instagram video URLs expire quickly and may have access controls.

---

## Transcription Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel transcription | All videos via Promise.allSettled | ✓ |
| Sequential transcription | One at a time | |
| Batched (5 at a time) | Two batches of 5 | |

**Auto-selected:** Parallel transcription (recommended — AssemblyAI handles concurrent requests, fastest approach)
**Notes:** With only 10 videos max, parallel is safe and fast.

---

## Per-Video HBC Extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Individual Gemini calls | One HBC analysis per video, parallel | ✓ |
| Batch all in one call | Send all transcriptions in one Gemini call | |

**Auto-selected:** Individual Gemini calls (recommended — TRNS-02 requires per-video breakdown stored per record; individual calls produce cleaner per-video output)
**Notes:** Cross-video analysis is a separate step (D-30). Per-video HBC needs to be stored on each viral_content record individually.

---

## Cross-Video Pattern Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Single batch Gemini call | All 10 transcriptions in one call (user-specified) | ✓ |
| Aggregate from per-video HBC | Programmatic aggregation of individual HBC results | |

**Auto-selected:** Single batch Gemini call (user-specified — explicitly requested this approach)
**Notes:** User wants Gemini to see ALL transcriptions at once for true cross-video pattern detection, not just aggregation of individual analyses.

---

## Task Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single compound task | All stages in extract-viral (discover → download → transcribe → HBC → patterns) | ✓ |
| Multiple sub-tasks | Separate Trigger.dev tasks for each stage | |

**Auto-selected:** Single compound task (recommended — simpler orchestration, all stages share context, matches extract-website/extract-social pattern)
**Notes:** Orchestrator already dispatches one extractViral task. Splitting into sub-tasks adds orchestration complexity without benefit.

---

## Scope Boundary Decision

**Script generation (2-3 scripts):** User mentioned this as Phase 6 work, but ROADMAP places creative modeling in Phase 7 (CRTV-01-04). Auto-resolved by deferring to Phase 7 while capturing user's rules in Phase 6 context for downstream use.

---

## Claude's Discretion

- Exact Apify actor IDs for viral discovery (research needed)
- Gemini prompt design for HBC extraction and cross-video patterns
- ViralPatterns type structure
- Database column for patterns storage
- maxDuration tuning

## Deferred Ideas

- Script generation — Phase 7 (CRTV-01-04)
- Facebook viral content — post-MVP
- Video thumbnails — nice-to-have
