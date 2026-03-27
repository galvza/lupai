# Pitfalls Research

**Domain:** Marketing intelligence platform with web scraping, AI synthesis, and video transcription
**Researched:** 2026-03-27
**Confidence:** HIGH (verified across multiple sources and official documentation)

## Critical Pitfalls

### Pitfall 1: Apify Free Tier Credits Exhausted Before Demo

**What goes wrong:**
The Apify free plan provides only $5/month in credits. A single analysis in LupAI triggers 7+ actors (Instagram, TikTok, Facebook Ads, SimilarWeb, Google Maps, Google Ads, website scraper). Each actor run consumes compute units (CUs), and browser-based actors (Playwright) cost 8-16x more than Cheerio-based ones. Running 5-10 full analyses during development and testing can exhaust the monthly budget before the demo on March 30th, leaving the product non-functional during evaluation.

**Why it happens:**
Developers test with real actors during development without tracking CU consumption. They assume "$5 is enough" without measuring actual cost per analysis cascade. Some Apify Store actors also charge per-result fees on top of CUs, which is easy to miss.

**How to avoid:**
1. Run one real actor per integration during development -- capture the output JSON and save it as a fixture in `tests/fixtures/`.
2. Use these fixture files for all subsequent development and testing via mock wrappers.
3. Track CU consumption after each real run using the Apify dashboard.
4. Budget: reserve at least $2-3 of the $5 for demo day and evaluation period.
5. Prioritize Cheerio-based actors over Playwright-based ones where both exist for the same platform.
6. Implement the 24h cache from day one -- if the evaluator runs the same niche twice, reuse cached data instead of burning credits.

**Warning signs:**
- More than 3 full cascade runs during development.
- Apify dashboard showing >$2 consumed before the product is feature-complete.
- Using `apify.call()` directly in development without mock wrappers.

**Phase to address:**
Phase 1 (Foundation) -- set up mock/fixture infrastructure before any actor integration. Phase 2 (Integrations) -- implement 24h cache immediately with first actor.

---

### Pitfall 2: Scraper Actors Return Empty or Partial Data Silently

**What goes wrong:**
Social media scrapers (Instagram, TikTok) frequently return empty arrays or partial datasets without throwing errors. Instagram throttles aggressively for high-profile accounts. TikTok's anti-bot is rated 5/5 difficulty in 2026. Private Instagram accounts return 0 results. SimilarWeb requires login for traffic data on some sites. The cascade continues processing downstream with empty data, producing a dashboard full of "no data available" sections, making the product look broken.

**Why it happens:**
Developers write the happy path -- actor returns data, process it, display it. They don't code for the scenario where an actor returns `{ items: [] }` or the actor run succeeds (status: SUCCEEDED) but the dataset is empty. Instagram and TikTok change their anti-bot measures weekly; what worked yesterday may not work today.

**How to avoid:**
1. Every Apify actor wrapper must validate output: check `items.length > 0` and verify key fields exist.
2. Implement a result quality score: "got 15/15 expected fields" vs "got 3/15 fields".
3. Design the dashboard to gracefully degrade: show "Dados insuficientes para esta seção -- Instagram limitou o acesso" instead of empty cards.
4. Never let a single actor failure cascade into a broken analysis. The CLAUDE.md already mandates independent cascade steps -- enforce this strictly.
5. For critical platforms (Instagram, TikTok), attempt a retry with reduced parameters (fewer posts, lower maxItems) before giving up.
6. Store the actor run ID and status alongside results for debugging.

**Warning signs:**
- Testing only with well-known brands that have public, active profiles.
- No validation layer between Apify output and database insertion.
- Dashboard components that crash on `undefined` or empty arrays.

**Phase to address:**
Phase 2 (Integrations) -- build validation and graceful degradation into every actor wrapper from the start.

---

### Pitfall 3: Gemini Free Tier Rate Limits Block the Analysis Pipeline

**What goes wrong:**
Since December 2025, Google reduced Gemini free tier quotas by 50-80%. The gemini-2.0-flash model (specified in CLAUDE.md) may have even tighter limits than newer models. Current free tier limits are 5-15 RPM and 100-1000 RPD depending on model. A single LupAI analysis makes multiple Gemini calls: input understanding, competitor synthesis, viral content analysis, creative modeling (roteiros), and final strategic recommendations. If 3-4 users run analyses within the same minute, RPM limits hit and the pipeline stalls with 429 errors.

**Why it happens:**
The December 2025 quota reduction caught many developers off guard. The limits apply per project (not per API key), and daily quotas reset at midnight Pacific Time (not UTC). Developers test one analysis at a time during development and never encounter the limit, then it breaks during demo when multiple analyses run.

**How to avoid:**
1. Implement exponential backoff with jitter for all Gemini calls -- retry 429 errors up to 3 times with 2s/4s/8s delays.
2. Batch the AI calls: combine competitor data into a single synthesis prompt instead of calling Gemini once per competitor.
3. Verify which model (gemini-2.0-flash vs gemini-2.5-flash-lite) offers the best RPM/RPD on the free tier and use that.
4. Cache AI outputs alongside scraping data in the 24h cache -- if same niche is analyzed twice, reuse the AI synthesis.
5. Use structured output (JSON schema) to get deterministic, parseable responses instead of free-text that needs post-processing (which would require additional API calls).
6. Monitor daily request count and display a user-facing warning when approaching limits.

**Warning signs:**
- No retry logic around Gemini API calls.
- More than 5 separate Gemini calls per analysis.
- Testing only during off-peak hours and never hitting limits.

**Phase to address:**
Phase 2 (Integrations) -- implement retry and batching from the first AI integration.

---

### Pitfall 4: Vercel Free Tier 10-Second Timeout Kills API Routes

**What goes wrong:**
Vercel's free (Hobby) plan has a hard 10-second timeout for serverless functions. The `/api/analyze` route must validate input, call Gemini for understanding, trigger the Trigger.dev job, and return. If the Gemini understanding call takes 3-5 seconds and there's any network latency, the route times out with a 504 error. Worse, the `/api/status/[id]` polling route or `/api/report/[id]` PDF generation route may also timeout if they do any heavy processing.

**Why it happens:**
Developers run `npm run dev` locally where there are no timeouts. Everything works. They deploy to Vercel and functions start timing out. The 10-second limit is not obvious in the Vercel free tier documentation.

**How to avoid:**
1. The `/api/analyze` route must be thin: validate input, create a database record with status "pending", trigger the Trigger.dev job, and return the analysis ID immediately. All heavy processing happens in Trigger.dev.
2. The Gemini "understanding" call should also happen inside Trigger.dev, not in the API route.
3. Set `export const maxDuration = 10` explicitly on all route handlers to make the constraint visible in code.
4. The `/api/status/[id]` route must only read from Supabase (fast) -- never do computation.
5. PDF generation in `/api/report/[id]` should pre-generate the PDF in Trigger.dev and store it in Bunny Storage, with the API route only returning the CDN URL.

**Warning signs:**
- Any `await` call to an external service (Gemini, Apify, AssemblyAI) inside an API route handler.
- API routes that work locally but return 504 on Vercel.
- No `maxDuration` export in route files.

**Phase to address:**
Phase 1 (Foundation) -- establish the pattern that API routes are thin dispatchers. Phase 2 (Integrations) -- enforce that all heavy work runs in Trigger.dev.

---

### Pitfall 5: Gemini Structured Output Breaks Between Model Versions

**What goes wrong:**
There are known, active bugs (as of March 2026) where Gemini structured output (JSON mode) behaves inconsistently between model versions. The gemini-2.5 models have issues when function calling is enabled alongside structured output. Schema complexity limits cause 400 errors. The project relies on Gemini to produce structured data (competitor analysis, creative roteiros with specific fields like gancho/corpo/CTA) -- if JSON parsing fails, the entire synthesis pipeline breaks.

**Why it happens:**
Developers test with one model version and it works. Google updates the model or deprecates a version. The structured output that worked perfectly starts returning malformed JSON or errors. This is an actively reported issue in the Google AI developer forums.

**How to avoid:**
1. Always use `responseMimeType: "application/json"` with a Zod schema for validation.
2. Wrap every Gemini response in a try/catch that attempts JSON.parse, and on failure, attempts to extract JSON from the response text using regex.
3. Keep schemas flat -- avoid deep nesting (max 2-3 levels). Use short property names.
4. Pin the model version explicitly (e.g., `gemini-2.0-flash-001`) rather than using the floating `gemini-2.0-flash` alias.
5. Have a fallback prompt that requests JSON in plain text mode if structured output fails.
6. Validate Gemini output with Zod before passing downstream -- never trust the raw response.

**Warning signs:**
- No Zod validation on Gemini responses.
- Using deeply nested JSON schemas with Gemini.
- No fallback when structured output returns malformed data.
- Using floating model aliases instead of pinned versions.

**Phase to address:**
Phase 2 (Integrations) -- build Gemini wrapper with validation and fallback from the start.

---

### Pitfall 6: Video Transcription Pipeline Has Too Many Failure Points

**What goes wrong:**
The transcription pipeline has 4 sequential steps, each of which can fail independently: (1) Apify finds viral video URLs, (2) Videos are downloaded, (3) Videos are uploaded to Bunny Storage, (4) Bunny CDN URLs are sent to AssemblyAI for transcription. Any link breaking means no transcriptions. Common failures: video URLs are expired or geo-blocked, download fails due to size/format, Bunny upload fails with wrong auth header (storage zone password vs account API key), AssemblyAI rejects the URL because it's not publicly accessible or the format is unsupported.

**Why it happens:**
Developers test each step in isolation with a known-good video file. They never test the end-to-end pipeline where step 1 provides URLs to step 2, etc. Social media video URLs are often temporary (expire in hours) or require authentication headers.

**How to avoid:**
1. Implement immediate download after Apify returns video URLs -- don't store URLs for later processing.
2. Validate video format and size before uploading to Bunny (AssemblyAI supports MP3, WAV, M4A, FLAC, and video formats, but files must be >160ms).
3. Use Bunny's storage zone password (not account API key) in the AccessKey header.
4. After Bunny upload, verify the CDN URL is accessible with a HEAD request before sending to AssemblyAI.
5. Make transcription optional -- the analysis should still produce valuable results without transcriptions. Mark videos as "transcricao indisponivel" rather than failing the whole analysis.
6. Set a video count limit (e.g., max 3 videos per analysis) to control costs and time.

**Warning signs:**
- Testing transcription with a manually uploaded file instead of the automated pipeline.
- No timeout on video downloads (some videos are 500MB+).
- Bunny Storage returning 401 errors.
- AssemblyAI returning "audio_url is not accessible" errors.

**Phase to address:**
Phase 2 (Integrations) -- build and test the pipeline end-to-end early. Phase 3 (AI/Synthesis) -- make transcription results optional in the synthesis.

---

### Pitfall 7: AI Recommendations Are Generic and Non-Actionable

**What goes wrong:**
The Gemini synthesis produces recommendations like "Invista em marketing de conteudo" or "Melhore sua presenca nas redes sociais" instead of specific, actionable advice tied to the actual competitor data. This is the exact failure mode called out in CLAUDE.md ("Gerar recomendacoes genericas na camada de IA -- toda recomendacao deve ser especifica e acionavel"). Generic recommendations make the product worthless -- the user could get that from ChatGPT without LupAI.

**Why it happens:**
Prompts are too vague. They ask Gemini to "analyze competitors and give recommendations" without injecting the actual scraped data into the prompt. Or the prompt is too long, hitting context limits, and Gemini truncates the analysis. Or the prompt asks for too many things at once, diluting the specificity.

**How to avoid:**
1. Structure prompts with explicit data injection: "Competidor A tem X seguidores, posta Y vezes por semana, engajamento de Z%. Competidor B tem..."
2. Include a "bad example" and "good example" in the prompt (few-shot):
   - Bad: "Melhore sua presenca nas redes sociais"
   - Good: "Seus concorrentes postam 4-5 Reels por semana com media de 2.3% engajamento. Voce deve priorizar Reels curtos (15-30s) sobre stories, focando em [nicho especifico]."
3. Break synthesis into focused sub-tasks: one prompt for social media strategy, one for content strategy, one for ad strategy. Specific prompts yield specific answers.
4. Set the prompt's role/persona to "analista de marketing senior com 10 anos de experiencia" to get professional-grade outputs.
5. Always include the niche context and competitive data in the prompt -- never ask for generic advice.

**Warning signs:**
- Prompts that don't include actual data from the scraping results.
- Single monolithic prompt trying to cover all analysis areas.
- Recommendations that could apply to any business in any niche.
- No few-shot examples in the prompt template.

**Phase to address:**
Phase 3 (AI/Synthesis) -- this is the core value proposition. Prompt engineering and testing with real data must be thorough.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip Zod validation on Apify outputs | Faster integration dev | Runtime crashes when actor output schema changes | Never -- Apify actors change output format without warning |
| Store raw Apify output in Supabase | Less data transformation code | 500MB Supabase free tier fills quickly; queries slow on JSONB blobs | Never -- CLAUDE.md explicitly mandates filtering relevant fields only |
| Hardcode actor IDs in source code | Quick to get running | Actor deprecated or replaced; need code changes | MVP only if wrapped in config constants |
| Use polling instead of SSE for progress | Simpler implementation | 15+ HTTP requests per analysis; poor UX; wastes Vercel function invocations | Acceptable for MVP with 3-5s intervals, migrate to SSE post-demo |
| Generate PDF client-side with jsPDF | No server-side dependency | Complex layouts break; dynamic content positioning is fragile; non-deterministic output | Acceptable for MVP if layout is kept simple (no complex tables/charts) |
| No retry logic on external API calls | Faster to build | Transient failures kill the entire analysis | Never -- every external call needs at least basic retry |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Apify | Using `apify.call()` and waiting synchronously | Use `apify.call()` inside Trigger.dev tasks. Set memory/timeout limits on actor runs to prevent runaway CU consumption |
| Apify | Not setting `maxItems` on social media scrapers | Always set `maxItems` (e.g., 20-50 posts) to control cost and runtime. Without it, actors scrape everything available |
| Bunny Storage | Using account API key instead of storage zone password | The AccessKey header requires the storage zone password, not the account-level API key. This causes silent 401 errors |
| Bunny Storage | Deleting and re-uploading to same path immediately | Bunny CDN cache may serve stale content. Use unique paths (e.g., include timestamp or analysis ID) |
| AssemblyAI | Sending a CDN URL that requires auth or is not yet propagated | Wait 1-2 seconds after Bunny upload before sending URL to AssemblyAI. Verify URL returns 200 with HEAD request first |
| AssemblyAI | Not handling the async polling model | AssemblyAI transcription is async -- submit, then poll for completion. Don't block on it. Integrate into the Trigger.dev cascade |
| Gemini API | Not setting `responseMimeType` for structured output | Always use `responseMimeType: "application/json"` with `responseSchema` when you need structured data. Plain text parsing is fragile |
| Gemini API | Using floating model alias (e.g., "gemini-2.0-flash") | Pin to a specific version (e.g., "gemini-2.0-flash-001") to avoid breaking changes when Google updates the model |
| Supabase | Using anon key for server-side operations | Use `SUPABASE_SERVICE_ROLE_KEY` in Trigger.dev tasks and API routes. The anon key has RLS restrictions |
| Trigger.dev | Using the deprecated `client.defineJob()` v2 pattern | Must use `task()` from `@trigger.dev/sdk/v3`. The v2 pattern will not work with v3 runtime |
| Meta Ad Library | Expecting spend data on commercial ads | Facebook only provides spend/impression data for political/issue ads. Commercial ads show creative, copy, and format only |
| SimilarWeb | Expecting data for small/local businesses | SimilarWeb only has data for sites with sufficient traffic. Local businesses (dentists, restaurants) will return empty results |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling /api/status every 1 second | Vercel function invocation count explodes; free tier has limits on invocations | Poll every 3-5 seconds. Better: use Supabase Realtime subscriptions for status updates | >5 concurrent analyses |
| Storing full video files in Supabase Storage | 1GB free storage fills after 2-3 videos | Use Bunny Storage for all media. Supabase only stores metadata and text data | After 2-3 analyses with videos |
| Loading all competitor data on dashboard mount | Slow initial render; large JSON payloads | Lazy load sections. Load summary first, then detailed data on demand per tab/section | >3 competitors with full data |
| No pagination on history page | Query returns all analyses ever run | Add pagination with LIMIT/OFFSET from the start. Default 10 per page | >50 analyses |
| Gemini prompts with full raw data | Token limits hit; responses truncated; cost increases | Pre-process and summarize data before sending to Gemini. Only include relevant fields | When competitor data exceeds 30KB |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Apify API token in client-side code | Anyone can use your Apify credits; $5 gone in minutes | All Apify calls must happen server-side (Trigger.dev tasks or API routes). Never prefix env var with NEXT_PUBLIC_ |
| Exposing Supabase service role key | Full database access without RLS; data deletion/modification | Only use service role key in server-side code. Client uses anon key with RLS |
| No rate limiting on /api/analyze endpoint | Anyone can spam analyses, burning all Apify/Gemini credits | Add basic rate limiting: max 3 analyses per minute per IP. Use a simple in-memory counter or Supabase check |
| Storing competitor data without attribution | Legal risk if presenting scraped data as original | Always attribute data sources in the dashboard: "Dados via Instagram", "Estimativa via SimilarWeb" |
| No input sanitization on user niche description | Prompt injection: user inputs malicious prompt that changes AI behavior | Sanitize input before injecting into Gemini prompts. Use structured input (Zod validation) not raw string concatenation |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during 1-3 minute cascade | User thinks the app is broken; refreshes; starts duplicate analyses | Show step-by-step progress: "Buscando concorrentes... Analisando Instagram... Gerando recomendacoes..." with estimated time |
| All-or-nothing results display | If one actor fails, user sees nothing or an error page | Show partial results immediately. "5 de 7 fontes analisadas" with available data. Grey out unavailable sections |
| Dashboard shows raw numbers without context | "12,450 seguidores" means nothing without competitor comparison | Always show comparisons: "12,450 seguidores (3x menos que a media dos concorrentes)" |
| Creative roteiros are a wall of text | User can't quickly scan or use the content | Structure roteiros visually: gancho in a highlighted box, corpo in body text, CTA in a distinct call-out. Make them copy-paste friendly |
| PDF export is an afterthought | PDF looks nothing like the dashboard; missing sections; bad formatting | Keep PDF layout simple. Match the dashboard structure. Test PDF generation with every dashboard change |
| No explanation of data sources | User doesn't understand where data comes from or how to interpret it | Add subtle "?" tooltips explaining each metric: "Engajamento calculado como (curtidas + comentarios) / seguidores" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Apify integration:** Often missing maxItems limits -- verify every actor call has explicit limits to prevent runaway costs
- [ ] **Apify integration:** Often missing proxy configuration -- verify residential proxy settings are configured for Instagram/TikTok actors
- [ ] **Error handling:** Often missing partial failure handling -- verify the dashboard renders correctly when 2 of 7 actors return empty data
- [ ] **Gemini synthesis:** Often missing actual data injection -- verify prompts contain real competitor numbers, not just instructions
- [ ] **Progress tracking:** Often missing intermediate status updates -- verify Trigger.dev tasks update Supabase status at each step, not just start/end
- [ ] **Cache system:** Often missing cache invalidation -- verify the 24h cache actually expires and doesn't serve stale data forever
- [ ] **PDF generation:** Often missing dynamic content handling -- verify PDF doesn't cut off long competitor names or recommendation text
- [ ] **Video transcription:** Often missing timeout on download -- verify there's a max file size (e.g., 50MB) and download timeout (e.g., 30s)
- [ ] **Dashboard:** Often missing empty state designs -- verify every section has a meaningful empty state, not just a blank area
- [ ] **Supabase schema:** Often missing indexes on frequently queried columns -- verify indexes exist on `niche_name`, `created_at`, and `status`

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Apify credits exhausted | MEDIUM | Switch to fixture data for demo. If evaluator runs live analysis, it will fail. Alternatively, create a new Apify account for fresh $5 credits |
| Gemini rate limit hit | LOW | Implement exponential backoff. If persistent, switch to gemini-2.5-flash-lite which has 15 RPM and 1000 RPD on free tier |
| Scraper returns empty data | LOW | Show graceful degradation UI. Add a manual "tentar novamente" button per section. Log the failure for debugging |
| Vercel timeout on API routes | MEDIUM | Move all processing to Trigger.dev. Make API routes only do database reads/writes. Requires restructuring if not done initially |
| Gemini returns malformed JSON | LOW | Add regex-based JSON extraction fallback. Retry once with simplified prompt. Fall back to plain text parsing as last resort |
| Video transcription pipeline fails | LOW | Make transcription optional in the synthesis. Show "Transcricao indisponivel" on the dashboard. The analysis is still valuable without transcriptions |
| Generic AI recommendations | HIGH | Requires prompt engineering overhaul. Needs real data to test against. Cannot be fixed with a quick code change -- needs iterative prompt refinement with real scraping outputs |
| Supabase free tier storage full | MEDIUM | Audit stored data. Delete old analyses. Ensure only filtered fields are stored (not raw Apify output). Media should be on Bunny, not Supabase |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Apify credits exhaustion | Phase 1 (Foundation) | Fixture/mock infrastructure exists before any real API call |
| Empty scraper results | Phase 2 (Integrations) | Every actor wrapper has output validation and returns typed partial results |
| Gemini rate limits | Phase 2 (Integrations) | Retry logic with exponential backoff wraps all Gemini calls |
| Vercel 10s timeout | Phase 1 (Foundation) | API routes contain zero external service calls; all heavy work in Trigger.dev |
| Gemini structured output bugs | Phase 2 (Integrations) | Zod validation on every Gemini response; fallback parsing exists |
| Video transcription chain failure | Phase 2 (Integrations) | End-to-end test with real video proves full pipeline works |
| Generic AI recommendations | Phase 3 (AI/Synthesis) | Prompt templates include data injection points; few-shot examples; tested with real data |
| No rate limiting on API | Phase 1 (Foundation) | Basic IP-based rate limit on /api/analyze exists |
| Polling overload | Phase 2 (Integrations) | Polling interval is >= 3 seconds; status route is a simple DB read |
| jsPDF layout issues | Phase 4 (Polish) | PDF tested with analyses that have varying data lengths and missing sections |

## Sources

- [Apify Free Tier Pricing 2026](https://use-apify.com/docs/what-is-apify/apify-free-plan) -- $5/month credits, CU pricing details
- [Apify Web Scraping Challenges 2025](https://blog.apify.com/web-scraping-challenges/) -- Anti-bot, rate limiting, scraper maintenance
- [Gemini API Free Tier Rate Limits 2026](https://www.aifreeapi.com/en/posts/gemini-api-free-tier-rate-limits) -- December 2025 quota reductions, RPM/RPD limits
- [Gemini API Rate Limits Official](https://ai.google.dev/gemini-api/docs/rate-limits) -- Official rate limit documentation
- [Gemini Structured Output Issues](https://github.com/googleapis/python-genai/issues/706) -- Inconsistent JSON mode between 2.0 and 2.5 models
- [Gemini Structured Output Improvements](https://blog.google/technology/developers/gemini-api-structured-outputs/) -- Official structured output docs
- [Vercel Function Timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) -- 10s Hobby plan limit, mitigation strategies
- [Vercel Function Duration Config](https://vercel.com/docs/functions/configuring-functions/duration) -- maxDuration configuration
- [Instagram Scraping Anti-Bot 2026](https://scrapfly.io/blog/posts/how-to-scrape-instagram) -- Login walls, GraphQL obfuscation, IP flagging
- [TikTok Scraping Difficulty 2026](https://scraperly.com/scrape/tiktok) -- 5/5 difficulty rating, ML-based detection
- [AssemblyAI Transcription Docs](https://www.assemblyai.com/docs/api-reference/transcripts/submit) -- URL requirements, supported formats
- [Bunny Storage API Reference](https://docs.bunny.net/reference/storage-api) -- Upload via PUT, auth with storage zone password
- [Apify Instagram Scraper Issues](https://apify.com/apify/instagram-scraper/issues/rate-limit-question-wkZKfCL4lFLWYF7Ey) -- Rate limiting, empty results
- [Supabase Free Tier Limits](https://supabase.com/pricing) -- 500MB database, 1GB storage
- [jsPDF Complex Layout Limitations](https://github.com/parallax/jsPDF/issues/2108) -- Dynamic positioning challenges
- [Meta Ad Library Limitations](https://apify.com/apify/facebook-ads-scraper) -- No spend data on commercial ads
- [SimilarWeb Scraper Deprecation](https://apify.com/tri_angle/similarweb-scraper) -- Login requirement changes

---
*Pitfalls research for: LupAI -- Marketing Intelligence Platform*
*Researched: 2026-03-27*
