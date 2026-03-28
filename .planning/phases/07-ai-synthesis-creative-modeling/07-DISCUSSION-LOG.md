# Phase 7: AI Synthesis & Creative Modeling - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-03-28
**Phase:** 07-ai-synthesis-creative-modeling
**Mode:** assumptions (--auto)
**Areas analyzed:** Gemini Output Format, Recommendation Specificity, Creative Script Generation, Architecture, Trigger.dev Task, Orchestrator Integration, Data Input Assembly, DB Storage

## Assumptions Presented

### Synthesis Gemini Call Architecture
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Two separate Gemini calls (synthesis + creative), not monolithic | Likely | `src/lib/ai/synthesize.ts` and `src/lib/ai/creative.ts` already separate; all AI modules follow one-function-per-call pattern |

### Trigger.dev Task Integration
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| New `src/trigger/synthesize.ts` task needed; orchestrator has no synthesis step | Confident | `src/trigger/analyze-market.ts` line 272 marks completed after extraction; no synthesize task file exists |

### Structured Output Schema Design
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Upgrade stubs from raw JSON.parse to Zod + zodToJsonSchema + validateOrNull | Confident | Current stubs use old pattern; mature modules use responseJsonSchema pattern |

### Data Aggregation Strategy
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Synthesis task fetches data from Supabase (receives only analysisId + context) | Likely | `getCompetitorsByAnalysis()`, `getViralContentByAnalysis()` queries exist; lightweight payload pattern established |

## Corrections Made

No corrections — all assumptions confirmed (--auto mode).

## Auto-Resolved

- Synthesis Gemini Call Architecture (Likely): auto-selected "Two separate calls" (recommended option)
- Data Aggregation Strategy (Likely): auto-selected "Task fetches from Supabase internally" (recommended option)

## User Pre-Decisions Applied

The following decisions were provided by the user before this session and incorporated directly:
- Gemini returns STRUCTURED JSON, not prose (from memory: project_future_phase_decisions.md)
- Section format: title, summary, metrics, tags, detailed_analysis (from user message + memory)
- Output sections specified (market overview, competitor analysis, gaps, viral patterns, scripts, recommendations)
- Recommendations must be specific and actionable with real data references
- Error handling: retry maxAttempts: 3, fallback chain (from memory: project_error_handling_strategy.md)
- Backend only — skip frontend/UI (from memory: feedback_skip_frontend.md)

## External Research Flagged

- Gemini 2.0-flash token limits for synthesis context (4 competitors + 10 viral videos + patterns)
- Gemini structured output reliability with complex nested schemas (sections with embedded markdown)

These will be investigated during research phase.
