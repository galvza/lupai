# Phase 6: Viral Content & Transcription - Research

**Researched:** 2026-03-28
**Domain:** Apify viral discovery, video download pipeline, AssemblyAI transcription, Gemini structured analysis
**Confidence:** HIGH

## Summary

Phase 6 implements a six-stage pipeline within a single Trigger.dev compound task (`extract-viral`): (1) discover viral videos via Apify hashtag scrapers, (2) filter by duration/date/engagement, (3) download to Bunny Storage, (4) transcribe via AssemblyAI, (5) extract per-video hook/body/CTA via Gemini, and (6) detect cross-video patterns via a single Gemini batch call. The existing codebase has strong foundations -- `uploadFile()`, `transcribeVideo()`, `createViralContent()`, validated types, and established compound task patterns from Phases 4-5.

The critical new work is the Apify wrappers for hashtag-based viral discovery (`clockworks/tiktok-hashtag-scraper` and `apify/instagram-hashtag-scraper`), which are fundamentally different actors from the profile-based scrapers already implemented. Video URLs from both platforms are temporary and expire quickly, confirming the user's decision (D-14) that immediate download to Bunny Storage is mandatory. The pipeline also requires schema extensions: new fields on `ViralContent` (caption, creator handle, duration, post date) and a new `viral_patterns` JSONB column on the `analyses` table.

**Primary recommendation:** Implement as a single compound task with 6 sequential stages, using `Promise.allSettled` for parallelism within each stage. Extend DB schema and types first, then build the pipeline top-to-bottom.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** TikTok + Instagram Reels ONLY -- no Facebook for MVP
- **D-02:** Viral search is INDEPENDENT of competitors -- searches the entire niche, any creator
- **D-03:** Search query derived from NicheInterpreted keywords (niche + segment from Phase 2)
- **D-04:** Top 5 viral videos per platform = 10 total per analysis
- **D-05:** Time window: last 30 days
- **D-06:** Sort by engagement rate (likes + comments + shares relative to views)
- **D-07:** MAX 4 minutes per video -- discard anything longer before download
- **D-08:** If a platform returns fewer than 5 qualifying videos, accept what's available
- **D-09:** Need NEW Apify wrapper functions for hashtag/trend-based viral search
- **D-10:** TikTok viral: Use `clockworks/tiktok-hashtag-scraper` (or similar hashtag/keyword actor)
- **D-11:** Instagram viral: Use `apify/instagram-hashtag-scraper` (or similar hashtag/Reels actor)
- **D-12:** Each actor must return: video URL, caption, engagement metrics, duration, creator handle, post date
- **D-13:** Filter by: duration <= 240s, last 30 days, engagement-sorted, top 5
- **D-14:** Videos MUST be downloaded to Bunny Storage first -- URLs are temporary
- **D-15:** Download via native `fetch()` -> Buffer -> `uploadFile()` to Bunny Storage
- **D-16:** Bunny Storage path: `viral/{analysisId}/{platform}/{videoIndex}.mp4`
- **D-17:** Store Bunny CDN URL in `bunny_url` field
- **D-18:** Skip failed downloads, try next candidate
- **D-19:** Create DB record immediately after successful download
- **D-20:** Transcribe ALL downloaded videos via AssemblyAI
- **D-21:** Use Bunny CDN URL as input to AssemblyAI
- **D-22:** Parallel transcription via `Promise.allSettled()`
- **D-23:** Store transcription text + duration on each record
- **D-24:** Failed transcription = null, continue
- **D-25:** Per-video HBC extraction via Gemini after transcription
- **D-26:** HBC identifies: hook text + timing, body structure, CTA text
- **D-27:** Store HookBodyCta on each record
- **D-28:** Parallel HBC extractions via `Promise.allSettled`
- **D-29:** No transcription = skip HBC (null hookBodyCta)
- **D-30:** Cross-video patterns: single batch Gemini call with ALL transcriptions
- **D-31:** Detect: hook patterns (first 3s), body structure, CTA patterns, dominant tone, best duration, recurring formulas
- **D-32:** Output is structured JSON (not prose)
- **D-33:** Store as `viral_patterns` JSONB on `analyses` table
- **D-34:** Output feeds directly into Phase 7
- **D-35:** Single compound Trigger.dev task (`extract-viral`)
- **D-36:** 6 sequential stages within task
- **D-37:** maxDuration: 180s (may need increase)
- **D-38:** Return pattern: `{ status, data: { viralContent[], patterns }, reason? }`
- **D-39:** Retry: maxAttempts 2, exponential backoff 3s-8s
- **D-40 to D-44:** Fallback chains per service
- **D-45:** Golden rule: partial data > no data
- **D-46:** validateOrNull pattern for all data stages
- **D-47 to D-49:** Validation rules for viral content, patterns, Zod schemas
- **D-50:** Progress tracking via metadata per stage
- **D-51:** Error messages in PT-BR

### Claude's Discretion
- Exact Apify actor IDs and input configurations for viral discovery
- Gemini prompt design for per-video HBC extraction
- Gemini prompt design for cross-video pattern detection batch call
- ViralPatterns type structure (JSON schema for cross-video patterns output)
- Whether to add `viral_patterns` column to `analyses` table or store on existing field
- Video file naming convention details in Bunny Storage
- Whether maxDuration 180s is sufficient or needs increase
- How to handle videos that have no audio

### Deferred Ideas (OUT OF SCOPE)
- Script generation (2-3 adapted scripts) -- Phase 7 (CRTV-01-04)
- Facebook viral content -- post-MVP
- Video thumbnails to Bunny Storage -- not critical for backend pipeline
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIRL-01 | System searches for viral content in the niche across TikTok and Instagram (Facebook deferred per D-01) | Apify actors `clockworks/tiktok-hashtag-scraper` and `apify/instagram-hashtag-scraper` support hashtag/keyword search. Both return engagement metrics, video URLs, duration, and metadata. |
| VIRL-02 | System downloads viral videos to Bunny Storage for transcription | Bunny Storage `uploadFile()` already implemented. Videos fetched via `fetch()` -> Buffer -> PUT. No file size limit on Bunny. TikTok/Instagram URLs are temporary and must be downloaded immediately. |
| VIRL-03 | Results display viral content gallery with engagement metrics | **SKIP** -- frontend display requirement. Backend stores all data needed for frontend consumption. |
| TRNS-01 | System transcribes viral videos using Assembly AI | `transcribeVideo()` already implemented. AssemblyAI free tier has $50 credits (~185 hours). 10 videos x 4 min max = 40 min per analysis -- negligible cost. |
| TRNS-02 | AI identifies hook, body, and CTA structure in each transcribed video | Gemini structured output with `responseJsonSchema` + `zodToJsonSchema` pattern established in Phase 2. HookBodyCta type already defined. |
| TRNS-03 | Results display transcription with hook/body/CTA breakdown per video | **SKIP** -- frontend display requirement. Backend stores all data for frontend consumption. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack:** TypeScript 5.7, Next.js 15.5, Supabase, Trigger.dev v4, `@google/genai`, `apify-client` 2.x, `assemblyai` SDK, Bunny Storage REST API
- **No `any` type** without justification
- **Arrow functions** for components and utilities
- **JSDoc** on all public functions
- **PT-BR** for error messages and AI outputs
- **Atomic commits** per task/feature
- **Functions < 30 lines** -- split if longer
- **Filter Apify output** at extraction time (never store raw actor response)
- **Trigger.dev** for all work > 10s (Vercel timeout)
- **Zod 3.24.x** pinned (Trigger.dev v4 incompatibility with Zod v4)
- **`zod-to-json-schema`** for Gemini structured output (established pattern)
- **Skip ALL frontend/UI work** -- backend only per user feedback
- **Fixture-based development** -- reserve Apify credits for demo

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@trigger.dev/sdk` | 4.3.x | Compound task, metadata, retry | Ready |
| `apify-client` | 2.22.x | Actor calls for viral discovery | Ready |
| `assemblyai` | 4.23.x | Video transcription | Ready |
| `@google/genai` | 1.46.x | HBC extraction + pattern detection | Ready |
| `zod` | 3.24.x | Schema validation | Ready |
| `zod-to-json-schema` | latest | Gemini responseJsonSchema | Ready |
| `@supabase/supabase-js` | 2.100.x | Database operations | Ready |

### No New Dependencies Required
All functionality can be implemented with existing installed packages. No new npm installs needed.

## Architecture Patterns

### Recommended File Structure
```
src/
  lib/
    apify/
      tiktok-viral.ts          # NEW: TikTok hashtag/keyword search wrapper
      instagram-viral.ts       # NEW: Instagram hashtag/Reels search wrapper
    ai/
      hbc-extraction.ts        # NEW: Per-video HBC extraction via Gemini
      viral-patterns.ts        # NEW: Cross-video pattern detection via Gemini
      prompts.ts               # EXTEND: Add HBC_EXTRACTION_PROMPT + VIRAL_PATTERNS_PROMPT
    validation/
      extractionSchemas.ts     # EXTEND: Add viral discovery + HBC + patterns schemas
  trigger/
    extract-viral.ts           # REPLACE STUB: Full compound task implementation
  types/
    viral.ts                   # EXTEND: Add caption, creatorHandle, duration, postDate, ViralPatterns
  config/
    apify.ts                   # EXTEND: Add viralTiktok + viralInstagram actor IDs
supabase/
  migrations/
    20260328_add_viral_fields.sql  # NEW: Add columns to viral_content + viral_patterns to analyses
tests/
  unit/
    extract-viral.test.ts      # NEW: Compound task tests
    tiktok-viral.test.ts       # NEW: Apify wrapper tests
    instagram-viral.test.ts    # NEW: Apify wrapper tests
    hbc-extraction.test.ts     # NEW: Gemini HBC tests
    viral-patterns.test.ts     # NEW: Gemini patterns tests
  fixtures/
    tiktok-viral.json          # NEW: Sample TikTok hashtag scraper output
    instagram-viral.json       # NEW: Sample Instagram hashtag scraper output
    hbc-extraction.json        # NEW: Sample HBC Gemini response
    viral-patterns.json        # NEW: Sample cross-video patterns
```

### Pattern 1: Compound Task with Sequential Stages
**What:** Single Trigger.dev task with 6 internal sequential stages, each using parallel operations within
**When to use:** When stages have data dependencies (transcription needs download URL, HBC needs transcription)
**Example:**
```typescript
// Source: Established pattern from extract-website.ts and extract-social.ts
export const extractViral = task({
  id: 'extract-viral',
  maxDuration: 300, // Increased from 180s -- see research below
  retry: { maxAttempts: 2, minTimeoutInMs: 3000, maxTimeoutInMs: 8000, factor: 2 },
  run: async (payload: ExtractViralPayload) => {
    // Stage 1: Discover (parallel TikTok + Instagram)
    metadata.set('viralProgress', { discover: 'running', filter: 'pending', download: 'pending', transcribe: 'pending', hbc: 'pending', patterns: 'pending' });
    const [ttResult, igResult] = await Promise.allSettled([
      searchViralTiktok(payload.niche, payload.segment),
      searchViralInstagram(payload.niche, payload.segment),
    ]);
    // Stage 2: Filter ...
    // Stage 3: Download (parallel, with skip-on-fail) ...
    // Stage 4: Transcribe (parallel via Promise.allSettled) ...
    // Stage 5: Per-video HBC (parallel via Promise.allSettled) ...
    // Stage 6: Cross-video patterns (single Gemini call) ...
  },
});
```

### Pattern 2: Apify Hashtag Search Wrapper
**What:** New wrapper functions that follow the same pattern as existing `scrapeInstagram()`/`scrapeTiktok()` but call different actors with hashtag/keyword input
**Example:**
```typescript
// Source: Pattern from src/lib/apify/tiktok.ts adapted for hashtag search
const ACTOR_ID = 'clockworks/tiktok-hashtag-scraper';

export interface ViralVideoCandidate {
  videoUrl: string;
  caption: string;
  creatorHandle: string;
  platform: ContentPlatform;
  postDate: string;
  durationSeconds: number;
  engagement: EngagementMetrics;
}

export const searchViralTiktok = async (
  niche: string,
  segment: string
): Promise<ViralVideoCandidate[]> => {
  const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  const hashtag = `${niche} ${segment}`.trim().replace(/\s+/g, '');
  const run = await client.actor(ACTOR_ID).call({
    hashtags: [hashtag],
    resultsPerPage: 20, // Over-fetch to allow filtering
  });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  // Map and filter items to ViralVideoCandidate[]
  return items.map(mapTiktokItem).filter(isValidCandidate);
};
```

### Pattern 3: Download-Then-Store Pipeline
**What:** Fetch video from temporary URL, upload to Bunny Storage, create DB record, then proceed to transcription
**Example:**
```typescript
// Download -> Upload -> DB record (per D-14, D-15, D-16, D-19)
const downloadAndStore = async (
  candidate: ViralVideoCandidate,
  analysisId: string,
  index: number
): Promise<ViralContent | null> => {
  try {
    // 1. Fetch video as buffer
    const response = await fetch(candidate.videoUrl);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());

    // 2. Upload to Bunny Storage
    const filePath = `viral/${analysisId}/${candidate.platform}/${String(index + 1).padStart(2, '0')}.mp4`;
    const cdnUrl = await uploadFile(filePath, buffer);

    // 3. Create DB record immediately (per D-19)
    const record = await createViralContent({
      analysisId,
      platform: candidate.platform,
      sourceUrl: candidate.videoUrl,
      engagementMetrics: candidate.engagement,
      caption: candidate.caption,
      creatorHandle: candidate.creatorHandle,
      durationSeconds: candidate.durationSeconds,
      postDate: candidate.postDate,
    });

    // 4. Update with bunny_url
    await updateViralContent(record.id, { bunnyUrl: cdnUrl });
    return { ...record, bunnyUrl: cdnUrl };
  } catch {
    return null; // Per D-18: skip failed, try next
  }
};
```

### Pattern 4: Gemini Structured Output for HBC
**What:** Use zodToJsonSchema with Gemini for type-safe HBC extraction
**Example:**
```typescript
// Source: Established pattern from src/lib/ai/understand.ts
import { zodToJsonSchema } from 'zod-to-json-schema';

const hookBodyCtaSchema = z.object({
  hook: z.string().describe('Texto do gancho que prende atencao nos primeiros segundos'),
  body: z.string().describe('Estrutura do corpo que mantem a atencao'),
  cta: z.string().describe('Chamada para acao final'),
  hookDurationSeconds: z.number().nullable().describe('Duracao estimada do gancho em segundos'),
  totalDurationSeconds: z.number().nullable().describe('Duracao total do video'),
});

const response = await genai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: `${HBC_EXTRACTION_PROMPT}\n\nTranscricao:\n"${transcription}"`,
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: zodToJsonSchema(hookBodyCtaSchema),
  },
});
```

### Anti-Patterns to Avoid
- **Downloading all videos sequentially:** Use `Promise.allSettled` for parallel downloads. Sequential would waste precious task time.
- **Storing raw Apify output:** Per CLAUDE.md D-15, always filter at extraction time. Only store the fields that map to `ViralVideoCandidate`.
- **Using platform URLs directly for AssemblyAI:** TikTok/Instagram URLs expire within minutes. Always use Bunny CDN URL.
- **Retrying the entire task on partial failures:** Individual stage failures should skip that item, not restart the pipeline. The golden rule (D-45) requires partial results.
- **Making HBC extraction synchronous per video:** All HBC calls are independent -- run them in parallel.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video transcription | Custom whisper/ffmpeg pipeline | `transcribeVideo()` (existing) | Already handles AssemblyAI API, language detection, error handling |
| File upload to Bunny | Custom HTTP client | `uploadFile()` (existing) | Already handles auth, error responses, CDN URL generation |
| Structured AI output | JSON.parse with manual validation | `zodToJsonSchema` + Gemini `responseJsonSchema` | Established pattern from Phase 2, type-safe, schema-enforced |
| Engagement rate calculation | Complex formula per platform | Simple formula: `(likes + comments + shares) / max(views, 1)` | Views can be null/0 on some platforms -- guard with max() |
| Video duration filtering | Post-download check | Pre-download filter from Apify output metadata | Both actors return duration in metadata -- filter BEFORE downloading |

## Common Pitfalls

### Pitfall 1: TikTok/Instagram Video URLs Expire
**What goes wrong:** Video fetch returns 403/404 because the URL expired between discovery and download
**Why it happens:** TikTok and Instagram CDN URLs are signed with time-limited tokens. They expire within minutes to hours.
**How to avoid:** Download videos to Bunny Storage immediately after discovery, before any other processing. Do NOT store the original URL for later use.
**Warning signs:** 403 Forbidden or empty responses when fetching video URLs

### Pitfall 2: maxDuration 180s May Be Insufficient
**What goes wrong:** Task times out before completing all 6 stages
**Why it happens:** Apify actors take 30-60s each, downloading 10 videos takes 20-40s, AssemblyAI transcription takes 10-30s per video (parallel but still has API latency), plus two Gemini calls.
**How to avoid:** Use maxDuration: 300s (5 minutes). Worst case: 60s discovery + 30s download + 60s transcription + 30s HBC + 15s patterns = ~195s. Add buffer for retries and API latency.
**Warning signs:** Task consistently reaching 170s+ in testing

### Pitfall 3: Apify Credit Exhaustion
**What goes wrong:** Apify calls fail with 402 or empty results because free tier credits ($5/month) are depleted
**Why it happens:** Each hashtag scraper run costs compute units. Running both TikTok + Instagram with 20 results each = meaningful credit spend. Phase 4-5 also uses Apify credits for competitor extraction.
**How to avoid:** Use fixtures during development. Request only 20 results per actor (not 100+). Reserve credits for demo runs. Consider that Instagram hashtag scraper uses PPR model ($2.60/1000 results).
**Warning signs:** `ApifyClientError` with status 402 or runs that return 0 items unexpectedly

### Pitfall 4: No Audio/Music-Only Videos
**What goes wrong:** AssemblyAI returns empty transcription for videos that are purely visual or music-only
**Why it happens:** Many viral TikTok/Instagram videos use trending audio tracks without speech
**How to avoid:** Treat empty transcription as valid (null transcription per D-24). Video still has metadata value (engagement metrics, caption). Skip HBC extraction for these (per D-29).
**Warning signs:** Multiple videos returning `""` transcription text

### Pitfall 5: Hashtag Derivation From Niche
**What goes wrong:** The derived hashtag is too broad ("clinica") or too narrow ("clinicaodontologicaemsp") returning irrelevant or zero results
**Why it happens:** Simple concatenation of niche+segment doesn't produce good hashtags
**How to avoid:** Try multiple hashtag variations: (1) niche as-is, (2) niche+segment concatenated, (3) common niche-related hashtags. Use the best-performing one or merge results from multiple attempts.
**Warning signs:** Discovery returning 0 or all-irrelevant results

### Pitfall 6: ViralContent Type/DB Schema Mismatch
**What goes wrong:** Cannot store caption, creatorHandle, duration, postDate because fields don't exist in DB or type
**Why it happens:** Current `ViralContent` type and `viral_content` table only have id, analysisId, platform, sourceUrl, bunnyUrl, transcription, hookBodyCta, engagementMetrics
**How to avoid:** First task MUST extend the DB schema and TypeScript types before implementing the pipeline. Add migration with new nullable columns.
**Warning signs:** Supabase insert errors, TypeScript compilation errors

## Code Examples

### TikTok Hashtag Scraper Output Fields
Based on `clockworks/tiktok-scraper` family (HIGH confidence -- same author):
```typescript
// Expected output fields from clockworks/tiktok-hashtag-scraper
interface TiktokHashtagItem {
  id: string;
  text: string;                    // caption
  createTimeISO: string;           // post date ISO
  webVideoUrl: string;             // primary video URL
  videoUrl?: string;               // fallback video URL
  mediaUrls?: string[];            // alternative media URLs
  diggCount: number;               // likes
  shareCount: number;              // shares
  playCount: number;               // views
  commentCount: number;            // comments
  collectCount: number;            // saves/bookmarks
  isAd: boolean;                   // paid content flag
  authorMeta: {
    name: string;                  // display name
    nickName: string;              // @handle
    fans: number;
    following: number;
  };
  videoMeta: {
    duration: number;              // seconds
    width: number;
    height: number;
  };
  hashtags: Array<{ name: string }>;
}
```

### Instagram Hashtag Scraper Output Fields
Based on `apify/instagram-scraper` family output patterns (MEDIUM confidence):
```typescript
// Expected output fields from apify/instagram-hashtag-scraper
interface InstagramHashtagItem {
  id: string;
  shortCode: string;
  caption: string;
  url: string;                     // post URL
  videoUrl: string;                // video file URL (for Reels)
  displayUrl?: string;             // thumbnail
  likesCount: number;              // likes (-1 if hidden)
  commentsCount: number;
  videoPlayCount?: number;         // views (Reels)
  videoViewCount?: number;         // alternative views field
  timestamp: string;               // ISO date
  ownerUsername: string;            // creator handle
  ownerFullName?: string;
  type: string;                    // "Video", "Image", "Sidecar"
  videoDuration?: number;          // seconds
  locationName?: string;
  hashtags?: string[];
}
```

### Mapping Apify Output to ViralVideoCandidate
```typescript
// TikTok mapping
const mapTiktokItem = (item: Record<string, unknown>): ViralVideoCandidate | null => {
  const videoUrl = (item.webVideoUrl as string) ?? (item.videoUrl as string);
  const duration = ((item.videoMeta as Record<string, unknown>)?.duration as number) ?? 0;
  if (!videoUrl || duration > 240) return null; // D-07: max 4 min

  return {
    videoUrl,
    caption: (item.text as string) ?? '',
    creatorHandle: ((item.authorMeta as Record<string, unknown>)?.nickName as string) ?? 'unknown',
    platform: 'tiktok' as ContentPlatform,
    postDate: (item.createTimeISO as string) ?? '',
    durationSeconds: duration,
    engagement: {
      views: (item.playCount as number) ?? null,
      likes: (item.diggCount as number) ?? 0,
      comments: (item.commentCount as number) ?? 0,
      shares: (item.shareCount as number) ?? null,
      saves: (item.collectCount as number) ?? null,
    },
  };
};

// Instagram mapping
const mapInstagramItem = (item: Record<string, unknown>): ViralVideoCandidate | null => {
  const videoUrl = item.videoUrl as string;
  const type = item.type as string;
  if (!videoUrl || type !== 'Video') return null; // Only Reels/Video
  const duration = (item.videoDuration as number) ?? 0;
  if (duration > 240) return null; // D-07: max 4 min

  return {
    videoUrl,
    caption: (item.caption as string) ?? '',
    creatorHandle: (item.ownerUsername as string) ?? 'unknown',
    platform: 'instagram' as ContentPlatform,
    postDate: (item.timestamp as string) ?? '',
    durationSeconds: duration,
    engagement: {
      views: (item.videoPlayCount as number) ?? (item.videoViewCount as number) ?? null,
      likes: Math.max((item.likesCount as number) ?? 0, 0), // -1 means hidden, treat as 0
      comments: (item.commentsCount as number) ?? 0,
      shares: null, // Instagram hashtag scraper may not include shares
      saves: null,
    },
  };
};
```

### Engagement Rate Sorting
```typescript
// D-06: Sort by engagement rate
const calculateEngagementRate = (e: EngagementMetrics): number => {
  const interactions = e.likes + e.comments + (e.shares ?? 0);
  const views = Math.max(e.views ?? 1, 1); // Avoid division by zero
  return interactions / views;
};

const sortByEngagement = (candidates: ViralVideoCandidate[]): ViralVideoCandidate[] =>
  [...candidates].sort((a, b) =>
    calculateEngagementRate(b.engagement) - calculateEngagementRate(a.engagement)
  );
```

### ViralPatterns Type Design (Claude's Discretion)
```typescript
/** Cross-video pattern analysis result */
export interface ViralPatterns {
  hookPatterns: Array<{
    pattern: string;           // Description of the hook pattern
    frequency: number;         // How many videos use it (out of total)
    examples: string[];        // Specific hook text examples
  }>;
  bodyStructures: Array<{
    structure: string;         // Description (e.g., "problem-solution", "before-after")
    frequency: number;
  }>;
  ctaPatterns: Array<{
    pattern: string;           // CTA description
    frequency: number;
    examples: string[];
  }>;
  dominantTone: string;        // e.g., "informativo", "entretenimento", "urgente"
  bestPerformingDuration: {
    averageSeconds: number;
    range: string;             // e.g., "15-45 segundos"
  };
  recurringFormulas: Array<{
    formula: string;           // Description of the recurring formula
    videoCount: number;        // How many videos match
  }>;
  totalVideosAnalyzed: number;
  analysisConfidence: 'high' | 'medium' | 'low';
}
```

### DB Schema Extension
```sql
-- New migration: add fields to viral_content and analyses
ALTER TABLE viral_content ADD COLUMN caption TEXT;
ALTER TABLE viral_content ADD COLUMN creator_handle TEXT;
ALTER TABLE viral_content ADD COLUMN duration_seconds INTEGER;
ALTER TABLE viral_content ADD COLUMN post_date TIMESTAMPTZ;

ALTER TABLE analyses ADD COLUMN viral_patterns JSONB;
```

### Query Extensions Needed
```typescript
// NEW: updateViralContent function (not yet in queries.ts)
export const updateViralContent = async (
  id: string,
  updates: {
    bunnyUrl?: string;
    transcription?: string;
    hookBodyCta?: HookBodyCta;
  }
): Promise<void> => {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('viral_content')
    .update({
      ...(updates.bunnyUrl !== undefined && { bunny_url: updates.bunnyUrl }),
      ...(updates.transcription !== undefined && { transcription: updates.transcription }),
      ...(updates.hookBodyCta !== undefined && { hook_body_cta: updates.hookBodyCta }),
    })
    .eq('id', id);
  if (error) throw new Error(`Erro ao atualizar conteudo viral ${id}: ${error.message}`);
};

// NEW: updateAnalysisViralPatterns function
export const updateAnalysisViralPatterns = async (
  analysisId: string,
  viralPatterns: ViralPatterns
): Promise<void> => {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('analyses')
    .update({ viral_patterns: viralPatterns })
    .eq('id', analysisId);
  if (error) throw new Error(`Erro ao salvar padroes virais para analise ${analysisId}: ${error.message}`);
};
```

## Apify Actor Research

### TikTok: `clockworks/tiktok-hashtag-scraper`
**Confidence:** HIGH
**Actor ID:** `clockworks/tiktok-hashtag-scraper`
**Input:**
```json
{
  "hashtags": ["dentista"],
  "resultsPerPage": 20
}
```
**Output fields:** `text` (caption), `webVideoUrl`/`videoUrl` (download URL), `diggCount` (likes), `playCount` (views), `shareCount`, `commentCount`, `collectCount` (saves), `createTimeISO` (post date), `videoMeta.duration` (seconds), `authorMeta.nickName` (creator handle), `isAd`
**Pricing:** Platform compute units (CU-based, ~$0.30/CU on free plan). A small run (20 results) costs approximately 0.05-0.1 CU.
**Important:** Video URLs are **temporary** and expire. Download immediately.

**Source:** [Apify - TikTok Hashtag Scraper](https://apify.com/clockworks/tiktok-hashtag-scraper)

### Instagram: `apify/instagram-hashtag-scraper`
**Confidence:** HIGH
**Actor ID:** `apify/instagram-hashtag-scraper`
**Input:**
```json
{
  "hashtags": ["dentista"],
  "resultsPerHashtag": 20,
  "searchType": "recent"
}
```
**Output fields:** `caption`, `videoUrl` (direct file URL), `likesCount` (likes, -1 if hidden), `commentsCount`, `videoPlayCount` (views), `timestamp` (ISO date), `ownerUsername` (creator), `type` ("Video"/"Image"/"Sidecar"), `videoDuration` (seconds)
**Pricing:** Pay-per-result (PPR) model: $2.60 per 1,000 results on Free plan. 20 results = ~$0.05 per run.
**Important:** Filter output by `type === "Video"` to get only Reels. Video URLs are also temporary.

**Source:** [Apify - Instagram Hashtag Scraper](https://apify.com/apify/instagram-hashtag-scraper)

### Hashtag Derivation Strategy
Both actors accept hashtags as input. The challenge is converting `niche + segment` (e.g., "odontologia estetica") into effective hashtags.

**Recommended approach:**
1. Primary: Use niche keyword directly (e.g., "dentista")
2. Secondary: Concatenate niche+segment without spaces (e.g., "odontologiaestetica")
3. Combine results from both and deduplicate by video URL

For TikTok, single-word hashtags tend to work better. For Instagram, both single-word and multi-word hashtags work.

## AssemblyAI Considerations

**Free tier:** $50 in one-time credits (~185 hours of transcription). This is very generous for the project scope.
**Cost per analysis:** 10 videos x 4 min max = 40 min = ~$0.10 per analysis. The $50 credit supports ~500 analyses.
**Concurrent limits:** Free tier allows 5 new streams per minute. Since we use `Promise.allSettled` for 10 parallel transcriptions, we may hit this limit. **Recommendation:** Batch into 2 groups of 5, with a 1-2 second delay between groups, or use sequential-with-concurrency-limit pattern.
**Language detection:** Already configured in `transcribeVideo()` with `language_detection: true`. Portuguese content will be auto-detected.
**No-audio handling:** AssemblyAI returns `status: 'error'` or empty text for audio-less files. The existing `transcribeVideo()` throws on error -- callers must catch and treat as null transcription.

**Source:** [AssemblyAI Pricing](https://www.assemblyai.com/pricing)

## Bunny Storage Considerations

**File size limit:** No hard limit on individual file size.
**Upload method:** PUT request with binary body (already implemented in `uploadFile()`).
**Path convention (per D-16):** `viral/{analysisId}/{platform}/{videoIndex}.mp4`
  - Example: `viral/abc123/tiktok/01.mp4`
  - Index is zero-padded 2-digit for sorting
**CDN delivery:** Immediate after upload -- no propagation delay for new files.
**File count:** Keep below 10,000 files per folder for optimal performance (not a concern for 10 videos).

**Source:** [Bunny Storage API Docs](https://docs.bunny.net/reference/put_-storagezonename-path-filename)

## maxDuration Recommendation

**Recommendation: 300 seconds (5 minutes)**

Timing breakdown (estimated worst case):
| Stage | Duration | Notes |
|-------|----------|-------|
| Discovery (2 Apify calls parallel) | 30-60s | Apify actor startup + execution |
| Filtering | <1s | In-memory operation |
| Download (10 videos parallel) | 20-40s | Depends on video size, ~5-20MB each |
| Transcription (10 parallel, batched) | 30-60s | AssemblyAI processing + 5/min limit |
| HBC extraction (10 parallel Gemini) | 15-30s | Gemini 2.0-flash is fast |
| Cross-video patterns (1 Gemini call) | 5-15s | Single call with all transcriptions |
| **Total worst case** | **~205s** | Plus retry/backoff buffer |

180s is too tight with no margin for retries or API latency spikes. 300s provides a comfortable buffer. This matches the orchestrator's `maxDuration: 300`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@google/generative-ai` | `@google/genai` | 2025 | Already using new SDK in project |
| Custom polling for job status | Trigger.dev Realtime hooks | 2025 (v4) | Already using in project |
| Zod v3 `zod-to-json-schema` | Zod v4 native `z.toJSONSchema()` | 2026 | CANNOT use -- Zod pinned to v3.24 for Trigger.dev compatibility |
| Manual JSON parsing from LLM | `responseJsonSchema` structured output | 2025 | Already established pattern in Phase 2 |

## Open Questions

1. **Exact Apify actor input field names**
   - What we know: Both actors accept hashtags as arrays with result limits
   - What's unclear: Exact field names may differ from documentation (e.g., `resultsPerPage` vs `resultsPerHashtag` vs `resultsLimit`)
   - Recommendation: Test with a small run during implementation. If field names are wrong, Apify returns helpful error messages. Fixtures should be created first for development.

2. **Video size and memory in Trigger.dev**
   - What we know: Videos are typically 5-20MB for 15-60s clips. 10 videos = 50-200MB total in sequential Buffer operations.
   - What's unclear: Trigger.dev worker memory limits for holding large Buffers
   - Recommendation: Download and upload one at a time (sequential within the download stage) rather than holding all 10 buffers in memory simultaneously. Use `for...of` loop with `Promise.allSettled` wrapping individual download+upload operations.

3. **Instagram Hashtag Scraper "searchType" parameter**
   - What we know: The actor supports filtering by recent/top posts
   - What's unclear: Whether "recent" is the correct field value or if "top" is better for finding viral content
   - Recommendation: Use "recent" first (last 30 days per D-05), then sort by engagement rate client-side

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/unit/extract-viral.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIRL-01 | Viral discovery via TikTok + Instagram Apify actors | unit | `npx vitest run tests/unit/tiktok-viral.test.ts tests/unit/instagram-viral.test.ts -x` | Wave 0 |
| VIRL-02 | Video download to Bunny + DB record creation | unit | `npx vitest run tests/unit/extract-viral.test.ts -x` | Wave 0 |
| TRNS-01 | AssemblyAI transcription of Bunny URLs | unit | `npx vitest run tests/unit/extract-viral.test.ts -x` | Wave 0 |
| TRNS-02 | HBC extraction + cross-video patterns via Gemini | unit | `npx vitest run tests/unit/hbc-extraction.test.ts tests/unit/viral-patterns.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/extract-viral.test.ts tests/unit/tiktok-viral.test.ts tests/unit/instagram-viral.test.ts tests/unit/hbc-extraction.test.ts tests/unit/viral-patterns.test.ts -x`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/extract-viral.test.ts` -- covers VIRL-01, VIRL-02, TRNS-01 (compound task)
- [ ] `tests/unit/tiktok-viral.test.ts` -- covers VIRL-01 (TikTok wrapper)
- [ ] `tests/unit/instagram-viral.test.ts` -- covers VIRL-01 (Instagram wrapper)
- [ ] `tests/unit/hbc-extraction.test.ts` -- covers TRNS-02 (per-video HBC)
- [ ] `tests/unit/viral-patterns.test.ts` -- covers TRNS-02 (cross-video patterns)
- [ ] `tests/fixtures/tiktok-viral.json` -- TikTok hashtag scraper mock output
- [ ] `tests/fixtures/instagram-viral.json` -- Instagram hashtag scraper mock output
- [ ] `tests/fixtures/hbc-extraction.json` -- Gemini HBC response mock
- [ ] `tests/fixtures/viral-patterns.json` -- Gemini cross-video patterns mock

## Sources

### Primary (HIGH confidence)
- [Apify TikTok Hashtag Scraper](https://apify.com/clockworks/tiktok-hashtag-scraper) - Actor capabilities, output fields, pricing
- [Apify Instagram Hashtag Scraper](https://apify.com/apify/instagram-hashtag-scraper) - Actor capabilities, Reels support, pricing ($2.60/1000 PPR)
- [AssemblyAI Pricing](https://www.assemblyai.com/pricing) - $50 free credits, 5 streams/min on free tier
- [Bunny Storage API](https://docs.bunny.net/reference/put_-storagezonename-path-filename) - Upload via PUT, no file size limits
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) - responseJsonSchema with Zod via zodToJsonSchema
- Existing codebase: `src/lib/storage/bunny.ts`, `src/lib/transcription/transcribe.ts`, `src/lib/ai/understand.ts`, `src/trigger/extract-social.ts` - Established patterns

### Secondary (MEDIUM confidence)
- [Best TikTok Scrapers on Apify](https://use-apify.com/blog/apify-tiktok-scrapers-collections-2026) - Actor comparison and recommendations
- [Instagram Scraper Tutorial](https://use-apify.com/blog/instagram-scraper-tutorial-2026) - Input/output field details
- [Apify Free Tier Pricing](https://use-apify.com/docs/what-is-apify/apify-free-plan) - $5/month credit refresh, CU costs

### Tertiary (LOW confidence)
- TikTok video URL expiration timing - Multiple sources agree URLs are temporary but exact TTL varies (minutes to hours)
- Exact `resultsPerPage`/`resultsPerHashtag` parameter names - Need validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, no new dependencies
- Architecture: HIGH - Pattern directly extends established Phase 4-5 compound task pattern
- Apify actors: HIGH for existence and capabilities, MEDIUM for exact input/output field names
- Pitfalls: HIGH - Video URL expiration is well-documented, memory concerns are standard Node.js knowledge
- AssemblyAI limits: HIGH - Official pricing page confirms $50 credits and 5 streams/min limit

**Research date:** 2026-03-28
**Valid until:** 2026-04-15 (Apify actor APIs may change, but core patterns are stable)
