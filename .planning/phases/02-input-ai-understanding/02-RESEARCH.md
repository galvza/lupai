# Phase 2: Input & AI Understanding - Research

**Researched:** 2026-03-27
**Domain:** Next.js App Router UI + Gemini AI structured output + Trigger.dev task triggering + Zod validation
**Confidence:** HIGH

## Summary

Phase 2 builds the user-facing entry point of LupAI: a homepage with a text input where users describe their niche, an AI interpretation layer that classifies and understands the input, a confirmation UI where users can adjust the AI's interpretation, and two API routes that handle interpretation and analysis kickoff. The technical foundation from Phase 1 is solid -- `understandNiche()`, Zod schemas, Supabase queries, and type definitions are all in place. The primary work is: (1) building the client-side React UI with state management for a multi-step flow (input -> classification -> confirmation -> trigger), (2) creating two API route handlers that stay under Vercel's 10s timeout, and (3) implementing the input classification branching logic (MINIMAL/MEDIUM/URL/EXCESSIVE/NONSENSE) before calling Gemini.

A critical architectural decision has been locked: the AI understanding call happens in the `/api/analyze/understand` API route, NOT in the main `/api/analyze` route. This keeps the main route thin (create record + trigger job < 2s). The understand route is the one that may approach the 5s mark due to Gemini latency. The existing `understandNiche()` function in `src/lib/ai/understand.ts` already handles the Gemini call with structured JSON output -- it needs minor enhancement to support the branching logic (follow-up questions for MINIMAL, error for NONSENSE, etc.).

**Primary recommendation:** Build the homepage as a single client component with useState-driven multi-step flow. Use fetch() to call the two API routes sequentially. Do NOT use Server Actions for this flow because the multi-step state (input -> loading -> confirmation -> loading -> redirect) requires fine-grained client-side control that Server Actions do not provide cleanly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single prominent textarea on the homepage -- no structured form, matches "input simples" from PRD
- **D-02:** Placeholder text with example niche (e.g., "Ex: e-commerce de suplementos esportivos no Brasil")
- **D-03:** Submit via button click with "Analisar" CTA -- not auto-submit
- **D-04:** Mode selection (Modo Rapido / Modo Completo) as toggle or radio below the input, Modo Rapido selected by default
- **D-05:** URL input field for user's business appears only when Modo Completo is selected (progressive disclosure)
- **D-06:** After AI interpretation, show confirmation inline below the input on the same page -- no modal, no separate page
- **D-07:** Confirmation displays a card with editable fields for niche, segment, and region individually (satisfies INPT-04 adjustment requirement)
- **D-08:** Confirmation message pattern: "Entendi: [niche] no segmento [segment] em [region]. Correto?" with edit capability
- **D-09:** Two actions on confirmation: "Corrigir" (returns to editable fields) and "Iniciar Analise" (proceeds)
- **D-10:** After user confirms and clicks "Iniciar Analise", system creates DB record, triggers Trigger.dev job, and redirects to /analysis/[id]
- **D-11:** Two separate endpoints -- POST /api/analyze/understand (classification + Gemini interpretation) and POST /api/analyze (create record + trigger job)
- **D-12:** POST /api/analyze/understand receives { nicheInput: string }, classifies input first, then either: returns follow-up questions (MINIMAL), calls understandNiche() (MEDIUM/EXCESSIVE), triggers URL scraping (URL), or returns error (NONSENSE)
- **D-13:** POST /api/analyze receives { nicheInput, nicheInterpreted, mode, userBusinessUrl? }, creates analysis record, triggers Trigger.dev job, returns { analysisId, redirectUrl }
- **D-14:** Both endpoints use Zod validation on request body
- **D-15:** Error responses in PT-BR with descriptive messages
- **D-16:** Show inline loading spinner/skeleton during AI interpretation (< 5s expected)
- **D-17:** Error messages displayed inline below the input -- not toast, not alert
- **D-18:** If AI interpretation fails, user can retry without reloading the page
- **D-19:** Before calling Gemini, classify input into one of 5 categories (MINIMAL, MEDIUM, URL, EXCESSIVE, NONSENSE)
- **D-20:** MINIMAL inputs: AI returns follow-up questions
- **D-21:** MEDIUM inputs: Happy path -- AI interprets directly
- **D-22:** URL inputs: Detect URL pattern, scrape-first flow
- **D-23:** EXCESSIVE inputs: Extract everything possible, show rich summary
- **D-24:** NONSENSE inputs: Validate BEFORE sending to Gemini
- **D-25:** understandNiche() needs branching logic based on input classification BEFORE calling Gemini
- **D-26:** UI confirmation flow adapts based on detected scenario
- **D-27:** Smart rotating placeholder that cycles through examples every 3-4 seconds
- **D-28:** Helper chips below the input -- clickable quick-start examples
- **D-29:** Inline tips that appear AS the user types
- **D-30:** First-time dismissible banner at top (uses localStorage)
- **D-31:** UX philosophy: GUIDE without BLOCKING

### Claude's Discretion
- Loading animation style (spinner vs skeleton vs dots)
- Exact card styling for the confirmation display
- How the mode toggle looks (radio buttons vs segmented control vs tabs)
- Transition/animation between input and confirmation states
- Exact visual styling of helper chips and inline tips

### Deferred Ideas (OUT OF SCOPE)
None -- analysis stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INPT-01 | User can type a free-text description of their niche/segment in a central input field | Homepage component with textarea, Tailwind v4 styling, rotating placeholder (D-27), helper chips (D-28), inline tips (D-29) |
| INPT-02 | AI interprets the input and identifies niche, segment, and region (< 5 seconds) | Existing `understandNiche()` in `src/lib/ai/understand.ts` calls Gemini 2.0 Flash with JSON output. Needs input classification layer (D-19) wrapping it. API route POST /api/analyze/understand handles the call |
| INPT-03 | System confirms interpretation with user before proceeding | Confirmation card shown inline (D-06) with "Entendi: [niche] no segmento [segment] em [region]. Correto?" pattern (D-08) |
| INPT-04 | User can adjust the interpretation before starting the analysis | Editable fields for niche, segment, region in the confirmation card (D-07). "Corrigir" button returns to editable mode (D-09) |
| ORCH-03 | API routes are thin dispatchers (< 10s execution to respect Vercel timeout) | POST /api/analyze is a thin dispatcher: Zod validate -> createAnalysis() -> tasks.trigger() -> return { analysisId, redirectUrl }. Expected < 2s. POST /api/analyze/understand is slightly heavier due to Gemini call but < 5s per INPT-02 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Language:** TypeScript 5.5+ (project uses ^5, installed as 5.7.x)
- **Runtime:** Node.js 20 LTS
- **Framework:** Next.js 15.5 App Router (installed as 15.5.14)
- **Database:** Supabase (service role for server, anon key for client)
- **Styling:** Tailwind CSS v4 (CSS-first config, @theme directive, no tailwind.config.js)
- **Jobs:** Trigger.dev v4 (task() pattern, maxDuration 300s)
- **AI:** @google/genai with gemini-2.0-flash model
- **Validation:** Zod 3.25.76 pinned (NOT v4, Trigger.dev incompatibility)
- **Testing:** Vitest 4.x, @testing-library/react 16.x
- **Components:** Arrow function components `const Component = () => {}`
- **Naming:** PascalCase for components, camelCase for utils/lib, PT-BR for all user-facing text
- **Imports:** External libs first, then internal, then types
- **Functions:** Max 30 lines, JSDoc on public functions
- **Git:** One feature per commit, tipo(escopo): descricao curta format
- **Security:** Never expose API keys client-side, all Apify/Gemini calls server-side
- **Error messages:** PT-BR, descriptive
- **No `any` type:** Without justification
- **Service clients:** Use process.env directly (not Zod config imports) per Phase 1 decision

## Standard Stack

### Core (Already Installed -- Phase 1)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| next | 15.5.14 | App Router, API routes, page routing | Already installed |
| react | 19.1.0 | UI rendering, useState, useEffect | Already installed |
| @google/genai | ^1 | Gemini 2.0 Flash API for niche understanding | Already installed, used in understand.ts |
| @supabase/supabase-js | ^2 | Database operations (createAnalysis, updateAnalysis) | Already installed |
| @trigger.dev/sdk | ^4 | Background job triggering from API routes | Already installed |
| @trigger.dev/react-hooks | ^4 | useRealtimeRun for progress tracking (used later in Phase 9, but token generated here) | Already installed |
| zod | 3.25.76 | Request validation in API routes | Already installed, pinned |
| zod-to-json-schema | ^3 | Convert Zod schemas for Gemini responseJsonSchema | Already installed |
| lucide-react | ^1 | Icons for UI (Search, Loader, Check, etc.) | Already installed |
| tailwindcss | ^4 | CSS-first utility classes | Already installed |

### No New Dependencies Required

Phase 2 does not require any new npm packages. Everything needed is already installed from Phase 1.

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/
├── app/
│   ├── page.tsx                          # Homepage -- REBUILD (currently placeholder)
│   ├── analysis/
│   │   └── [id]/
│   │       └── page.tsx                  # Shell page (minimal, full UI in Phase 9)
│   ├── api/
│   │   └── analyze/
│   │       ├── understand/
│   │       │   └── route.ts              # POST: classify + interpret niche
│   │       └── route.ts                  # POST: create record + trigger job
│   └── layout.tsx                        # Already exists
├── components/
│   ├── ui/
│   │   ├── Button.tsx                    # Reusable button with loading state
│   │   ├── Input.tsx                     # Reusable input/textarea
│   │   ├── Card.tsx                      # Reusable card container
│   │   └── LoadingDots.tsx               # Loading animation
│   └── analysis/
│       ├── NicheInput.tsx                # Main input section with textarea + mode toggle + chips
│       ├── ConfirmationCard.tsx          # AI interpretation confirmation with edit capability
│       └── RotatingPlaceholder.tsx       # Cycling placeholder text animation
├── lib/
│   └── ai/
│       ├── understand.ts                 # ENHANCE: add classification branching
│       ├── classify.ts                   # NEW: input classification function
│       └── prompts.ts                    # ENHANCE: add classification prompt variations
├── hooks/
│   └── useAnalysis.ts                    # NEW: hook for the input -> confirm -> trigger flow
├── utils/
│   └── validators.ts                     # ENHANCE: add understand request schema
└── types/
    └── analysis.ts                       # ENHANCE: add InputClassification type, UnderstandResponse type
```

### Pattern 1: Client-Side Multi-Step Form with fetch()

**What:** A single "use client" component manages the entire input-to-redirect flow using useState to track the current step (input -> loading -> confirmation -> loading -> redirect).

**When to use:** When the flow has multiple asynchronous steps with different UI states that need fine-grained client control. Server Actions are not ideal here because we need loading states between two sequential API calls and conditional UI rendering based on classification results.

**Why not Server Actions:** The flow calls two separate endpoints sequentially (`/api/analyze/understand` then `/api/analyze`), with user interaction (confirmation/edit) between them. Server Actions work best for single form -> action -> response patterns. Our flow is: submit -> show interpretation -> user edits/confirms -> submit again -> redirect. This requires client-side state.

**Example:**
```typescript
'use client';

import { useState } from 'react';
import type { NicheInterpreted } from '@/types/analysis';

type FlowStep = 'input' | 'understanding' | 'confirmation' | 'starting' | 'error';

interface UnderstandResponse {
  classification: InputClassification;
  interpreted?: NicheInterpreted;
  followUpQuestions?: string[];
  error?: string;
}

const HomePage = () => {
  const [step, setStep] = useState<FlowStep>('input');
  const [nicheInput, setNicheInput] = useState('');
  const [mode, setMode] = useState<'quick' | 'complete'>('quick');
  const [interpreted, setInterpreted] = useState<NicheInterpreted | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnderstand = async () => {
    setStep('understanding');
    setError(null);
    try {
      const res = await fetch('/api/analyze/understand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheInput }),
      });
      const data: UnderstandResponse = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido');
      // Handle based on classification...
      setInterpreted(data.interpreted ?? null);
      setStep('confirmation');
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    }
  };

  const handleStartAnalysis = async () => {
    setStep('starting');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicheInput, nicheInterpreted: interpreted, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Redirect to analysis page
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    }
  };
  // ... render based on step
};
```

### Pattern 2: Input Classification Before AI Call

**What:** A lightweight function that classifies user input into one of 5 categories (MINIMAL, MEDIUM, URL, EXCESSIVE, NONSENSE) using regex and string analysis. Runs before any Gemini API call to save tokens and provide appropriate UI responses.

**When to use:** In the POST /api/analyze/understand route, as the first step before deciding whether to call Gemini.

**Example:**
```typescript
export type InputClassification = 'MINIMAL' | 'MEDIUM' | 'URL' | 'EXCESSIVE' | 'NONSENSE';

const URL_PATTERN = /^(https?:\/\/|www\.|[\w-]+\.(com|com\.br|net|org|io|app|store|shop))/i;
const NONSENSE_PATTERN = /^[^a-zA-ZÀ-ÿ]*$/; // no letters at all

export const classifyInput = (input: string): InputClassification => {
  const trimmed = input.trim();

  // NONSENSE: empty-ish, no real words, gibberish
  if (trimmed.length < 3 || NONSENSE_PATTERN.test(trimmed)) {
    return 'NONSENSE';
  }

  // URL: detected URL pattern
  if (URL_PATTERN.test(trimmed)) {
    return 'URL';
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // MINIMAL: 1-2 words, insufficient context
  if (wordCount <= 2) {
    return 'MINIMAL';
  }

  // EXCESSIVE: long paragraph, 30+ words
  if (wordCount >= 30) {
    return 'EXCESSIVE';
  }

  // MEDIUM: the happy path (3-29 words)
  return 'MEDIUM';
};
```

### Pattern 3: Thin API Route Dispatcher (Vercel 10s safe)

**What:** The POST /api/analyze route does only: Zod validate, createAnalysis(), tasks.trigger(), return JSON. No Gemini calls, no external service calls beyond Supabase and Trigger.dev SDK.

**When to use:** For the "start analysis" endpoint that must complete under Vercel's 10s timeout.

**Example:**
```typescript
// src/app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';
import { createAnalysis, updateAnalysis } from '@/lib/supabase/queries';
import type { analyzeMarket } from '@/trigger/analyze-market';

const startAnalysisSchema = z.object({
  nicheInput: z.string().min(3).max(500),
  nicheInterpreted: z.object({
    niche: z.string().min(1),
    segment: z.string().min(1),
    region: z.string().min(1),
  }),
  mode: z.enum(['quick', 'complete']).default('quick'),
  userBusinessUrl: z.string().url().nullable().optional(),
});

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const validated = startAnalysisSchema.parse(body);

    // 1. Create analysis record
    const analysis = await createAnalysis({
      nicheInput: validated.nicheInput,
      mode: validated.mode,
      userBusinessUrl: validated.userBusinessUrl,
    });

    // 2. Update with interpreted data
    await updateAnalysis(analysis.id, {
      nicheInterpreted: validated.nicheInterpreted,
      status: 'processing',
    });

    // 3. Trigger background job (fire-and-forget)
    const handle = await tasks.trigger<typeof analyzeMarket>(
      'analyze-market',
      {
        analysisId: analysis.id,
        niche: validated.nicheInterpreted.niche,
        segment: validated.nicheInterpreted.segment,
        region: validated.nicheInterpreted.region,
        mode: validated.mode,
        userBusinessUrl: validated.userBusinessUrl ?? null,
      }
    );

    // 4. Store trigger run ID for realtime tracking
    await updateAnalysis(analysis.id, {
      triggerRunId: handle.id,
    });

    return NextResponse.json({
      analysisId: analysis.id,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
      redirectUrl: `/analysis/${analysis.id}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos. Verifique os campos e tente novamente.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao iniciar analise. Tente novamente.' },
      { status: 500 }
    );
  }
};
```

### Pattern 4: Trigger.dev Task Triggering with Public Access Token

**What:** When triggering a task from an API route, the returned handle includes `id` and `publicAccessToken`. Store the run ID in the analysis record and pass the token to the frontend for realtime subscriptions.

**When to use:** In POST /api/analyze, when starting the background analysis job.

**Key details:**
- `tasks.trigger()` returns `{ id: string, publicAccessToken: string }`
- Import the task TYPE only (not the actual task) in the API route: `import type { analyzeMarket } from '@/trigger/analyze-market'`
- Pass the task string ID as first argument: `tasks.trigger<typeof analyzeMarket>('analyze-market', payload)`
- The publicAccessToken has a 15-minute default expiration, automatically scoped to the triggered run
- Store `handle.id` as `trigger_run_id` in the analyses table for later reference

### Pattern 5: Gemini Structured Output with Zod + zod-to-json-schema

**What:** The existing `understandNiche()` uses `responseMimeType: 'application/json'` but does NOT use `responseJsonSchema`. For more reliable structured output, use `zod-to-json-schema` to convert the Zod schema and pass it to Gemini.

**When to use:** In `understandNiche()` when calling Gemini for interpretation.

**Example enhancement:**
```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import { nicheInterpretedSchema } from '@/utils/validators';

const response = await genai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: `${UNDERSTAND_NICHE_PROMPT}\n\nInput do usuario: "${userInput}"`,
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: zodToJsonSchema(nicheInterpretedSchema),
  },
});
```

### Pattern 6: Rotating Placeholder Animation

**What:** A textarea with placeholder text that cycles through examples using CSS fade transitions and a useEffect interval.

**When to use:** For D-27 -- the smart rotating placeholder.

**Implementation approach:**
- Use a separate `<span>` visually positioned over the textarea (not the native placeholder attribute, since it cannot be animated)
- Cycle through examples with `setInterval` at 3-4 second intervals
- Apply CSS transition on opacity for fade effect
- Hide the overlay when the textarea has content (input.length > 0)

### Anti-Patterns to Avoid

- **Server Actions for multi-step flows:** Do not use Server Actions for the input -> understand -> confirm -> start flow. Server Actions are designed for single form submission -> response patterns. The multi-step flow needs client-side state.
- **Calling Gemini in POST /api/analyze:** The understand call belongs in POST /api/analyze/understand. The main /api/analyze route must be a thin dispatcher.
- **Using `triggerAndWait` in API routes:** This would block until the background job completes (1-3 minutes), far exceeding Vercel's 10s timeout. Use `tasks.trigger()` (fire-and-forget) only.
- **Hardcoding classification thresholds in UI:** The input classification logic should live in `src/lib/ai/classify.ts` (server-side), not duplicated in the client component. The API route handles classification and returns the result.
- **Using native textarea placeholder for animation:** Native placeholder text cannot be animated with CSS transitions. Use an overlay element.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom validation functions | Zod schemas (already in validators.ts) | Edge cases in string/URL validation; Zod handles them |
| JSON response schema for Gemini | Manual JSON schema definition | `zodToJsonSchema(nicheInterpretedSchema)` | Keeps Zod and Gemini in sync; single source of truth |
| Realtime progress tracking | Custom WebSocket/SSE server | Trigger.dev Realtime + useRealtimeRun | Infrastructure is managed; Electric SQL under the hood |
| Loading state management | Complex reducer with action types | Simple useState with FlowStep union type | The flow has 5 states max; useState is sufficient |
| URL detection | Custom URL parser | Regex pattern + URL constructor validation | Simple heuristic for classification; full validation not needed at classify step |

## Common Pitfalls

### Pitfall 1: Gemini Understanding Call Exceeds 5s SLA

**What goes wrong:** The Gemini 2.0 Flash call in `understandNiche()` takes > 5 seconds due to cold start, rate limits, or network latency, making the user wait too long.
**Why it happens:** Free tier Gemini has reduced quotas since Dec 2025. Cold starts on first call of the day can be 2-3s. Network latency from Brazil adds 100-300ms.
**How to avoid:**
1. Show loading animation immediately (D-16) so user sees progress
2. The existing function already uses `gemini-2.0-flash` (fastest model)
3. Add a 10s timeout with AbortController on the fetch call from client side
4. Return a user-friendly timeout error if it exceeds the limit
5. Implement retry in the client -- if first call fails, user can click "Tentar novamente" (D-18)
**Warning signs:** No timeout on the Gemini call; no retry mechanism in UI

### Pitfall 2: URL Classification False Positives

**What goes wrong:** The URL regex matches inputs like "net worth" or "e-commerce.com.br de roupas" incorrectly, routing them to the URL scraping path instead of the MEDIUM interpretation path.
**Why it happens:** Simple regex for URL detection can match substrings of natural language text.
**How to avoid:**
1. Check if the entire input (trimmed) matches the URL pattern, not just a substring
2. Require the URL-like string to be the primary/only content (not embedded in a sentence)
3. If mixed (URL + description), classify as MEDIUM and extract the URL separately for later use
**Warning signs:** Testing only with clean URL inputs; not testing with mixed text containing domain names

### Pitfall 3: createAnalysis() and updateAnalysis() Called Sequentially

**What goes wrong:** POST /api/analyze makes 3 sequential DB calls (create, update interpreted, update triggerRunId), each adding 50-200ms latency, potentially pushing total route time toward the 10s limit.
**Why it happens:** The current queries.ts separates create from update. The create function doesn't accept nicheInterpreted or triggerRunId.
**How to avoid:**
1. Extend `createAnalysis()` to accept optional nicheInterpreted in the insert
2. Combine the interpreted update with the triggerRunId update into a single updateAnalysis call
3. Target: 2 DB calls total (create with interpreted, update with triggerRunId + status)
**Warning signs:** More than 2 sequential awaits to Supabase in the /api/analyze route

### Pitfall 4: Client-Side State Desync on Error Recovery

**What goes wrong:** User submits, gets an error, edits input, submits again -- but the state still holds the old interpreted data, mode selection, or error message.
**Why it happens:** Error recovery doesn't properly reset intermediate state.
**How to avoid:**
1. When user clicks "Tentar novamente" or modifies input, reset interpreted, error, and step states together
2. Use a single "reset to input" function that clears all intermediate state
3. Never show stale confirmation data from a previous attempt
**Warning signs:** No explicit state reset on retry; error state and confirmation state coexisting

### Pitfall 5: Trigger.dev SDK Not Configured for API Routes

**What goes wrong:** `tasks.trigger()` fails with authentication errors because the Trigger.dev SDK requires `TRIGGER_SECRET_KEY` (or `TRIGGER_API_KEY`) to be set as an environment variable, and the SDK needs to be configured for the project.
**Why it happens:** The SDK auto-detects environment variables but may not work if env vars are named differently or not set in the Vercel deployment.
**How to avoid:**
1. Verify `TRIGGER_API_KEY` is set in .env (already in .env.example from Phase 1)
2. The SDK reads `TRIGGER_API_KEY` and `TRIGGER_API_URL` automatically
3. Test the trigger call locally with `npx trigger.dev@latest dev` running
**Warning signs:** tasks.trigger() throwing "unauthorized" or "project not found" errors

### Pitfall 6: Analysis Shell Page Missing for Redirect

**What goes wrong:** After POST /api/analyze succeeds and the client tries to redirect to `/analysis/[id]`, the page doesn't exist, resulting in a 404.
**Why it happens:** Phase 2 creates the API routes but the /analysis/[id] page is noted for Phase 9 (dashboard). The redirect target must exist as at least a shell.
**How to avoid:**
1. Create a minimal /analysis/[id]/page.tsx in Phase 2 that shows "Analise em andamento..." with the analysis ID
2. This page will be fully built in Phase 9 but needs to exist for the redirect to work
3. Store the publicAccessToken in the URL query params or in a cookie/localStorage for later use by the realtime hooks
**Warning signs:** Redirect to a non-existent route; no shell page created

## Code Examples

### Input Classification Function
```typescript
// src/lib/ai/classify.ts
// Source: Phase 2 CONTEXT.md D-19 through D-24

export type InputClassification = 'MINIMAL' | 'MEDIUM' | 'URL' | 'EXCESSIVE' | 'NONSENSE';

/** Regex para detectar URLs como input principal */
const URL_PATTERN = /^(https?:\/\/|www\.)[^\s]+$|^[a-zA-Z0-9][\w-]*\.(com|com\.br|net|org|io|app|store|shop)(\.br)?(\/\S*)?$/i;

/** Detecta inputs sem conteudo semantico */
const hasMinimalLetters = (input: string): boolean => {
  const letters = input.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  return letters.length < 3;
};

/**
 * Classifica o input do usuario antes de enviar ao Gemini.
 * Economiza tokens de API ao filtrar inputs invalidos ou insuficientes.
 */
export const classifyInput = (input: string): InputClassification => {
  const trimmed = input.trim();

  if (trimmed.length === 0 || hasMinimalLetters(trimmed)) {
    return 'NONSENSE';
  }

  if (URL_PATTERN.test(trimmed)) {
    return 'URL';
  }

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length <= 2) {
    return 'MINIMAL';
  }

  if (words.length >= 30) {
    return 'EXCESSIVE';
  }

  return 'MEDIUM';
};
```

### Understand API Route with Classification Branching
```typescript
// src/app/api/analyze/understand/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { classifyInput } from '@/lib/ai/classify';
import { understandNiche } from '@/lib/ai/understand';

const understandSchema = z.object({
  nicheInput: z.string().min(1).max(500),
});

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const { nicheInput } = understandSchema.parse(body);

    const classification = classifyInput(nicheInput);

    switch (classification) {
      case 'NONSENSE':
        return NextResponse.json({
          classification,
          error: 'Nao consegui entender. Descreva o nicho do seu negocio com mais detalhes.',
        }, { status: 400 });

      case 'MINIMAL':
        return NextResponse.json({
          classification,
          followUpQuestions: [
            'Que tipo de negocio voce tem?',
            'Qual a regiao ou cidade?',
            'Qual o publico-alvo?',
          ],
        });

      case 'URL':
        // For Phase 2, treat URL as MEDIUM with the URL stored for later scraping
        // Full URL scraping is a Phase 3+ feature
        return NextResponse.json({
          classification: 'URL',
          interpreted: {
            niche: 'negocio online',
            segment: 'a definir apos analise do site',
            region: 'Brasil',
          },
          urlDetected: nicheInput.trim(),
        });

      case 'MEDIUM':
      case 'EXCESSIVE': {
        const interpreted = await understandNiche(nicheInput);
        return NextResponse.json({
          classification,
          interpreted,
        });
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Input invalido. Descreva seu nicho em texto.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao interpretar nicho. Tente novamente.' },
      { status: 500 }
    );
  }
};
```

### Trigger.dev Task Trigger from API Route
```typescript
// Source: Trigger.dev docs - https://trigger.dev/docs/guides/frameworks/nextjs
import { tasks } from '@trigger.dev/sdk';
import type { analyzeMarket } from '@/trigger/analyze-market';

// Inside POST handler:
const handle = await tasks.trigger<typeof analyzeMarket>(
  'analyze-market',
  {
    analysisId: analysis.id,
    niche: validated.nicheInterpreted.niche,
    segment: validated.nicheInterpreted.segment,
    region: validated.nicheInterpreted.region,
    mode: validated.mode,
    userBusinessUrl: validated.userBusinessUrl ?? null,
  }
);

// handle.id = run ID (store in DB)
// handle.publicAccessToken = pass to frontend for realtime
```

### Analyze Market Task Stub (for Phase 2)
```typescript
// src/trigger/analyze-market.ts
// Replaces example.ts -- full orchestration built in Phase 3
import { task, metadata } from '@trigger.dev/sdk';

export const analyzeMarket = task({
  id: 'analyze-market',
  run: async (payload: {
    analysisId: string;
    niche: string;
    segment: string;
    region: string;
    mode: 'quick' | 'complete';
    userBusinessUrl: string | null;
  }) => {
    metadata.set('status', 'started');
    metadata.set('step', 'Analise iniciada');
    metadata.set('progress', 0);

    // Stub: full orchestration in Phase 3
    // For now, just acknowledge the job was received
    return {
      analysisId: payload.analysisId,
      message: 'Analise iniciada com sucesso',
    };
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@google/generative-ai` SDK | `@google/genai` SDK | Late 2024/Early 2025 | New API: `ai.models.generateContent()` instead of `model.generateContent()`. Project already uses the new SDK |
| Polling for Trigger.dev status | Trigger.dev Realtime API + useRealtimeRun | Trigger.dev v4 (2025) | Eliminates polling; publicAccessToken auto-generated on trigger |
| `tailwind.config.js` | CSS-first config with `@theme` | Tailwind v4 (2025) | Already configured in Phase 1 |
| `responseMimeType` only | `responseMimeType` + `responseJsonSchema` | @google/genai v1.x | More reliable structured output with schema enforcement |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (exists from Phase 1) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INPT-01 | Textarea renders, accepts input, placeholder rotates | unit (component) | `npx vitest run tests/unit/NicheInput.test.tsx -t "renders textarea"` | Wave 0 |
| INPT-02 | classifyInput returns correct classification for each category | unit | `npx vitest run tests/unit/classify.test.ts` | Wave 0 |
| INPT-02 | POST /api/analyze/understand returns interpreted niche | unit | `npx vitest run tests/unit/understand-route.test.ts` | Wave 0 |
| INPT-03 | ConfirmationCard renders with niche/segment/region | unit (component) | `npx vitest run tests/unit/ConfirmationCard.test.tsx -t "renders confirmation"` | Wave 0 |
| INPT-04 | ConfirmationCard editable fields update state | unit (component) | `npx vitest run tests/unit/ConfirmationCard.test.tsx -t "editable fields"` | Wave 0 |
| ORCH-03 | POST /api/analyze validates, creates record, triggers job, returns < 10s | unit | `npx vitest run tests/unit/analyze-route.test.ts` | Wave 0 |
| D-19 | classifyInput correctly categorizes all 5 input types | unit | `npx vitest run tests/unit/classify.test.ts` | Wave 0 |
| D-24 | NONSENSE inputs return error without calling Gemini | unit | `npx vitest run tests/unit/understand-route.test.ts -t "NONSENSE"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `tests/unit/classify.test.ts` -- covers INPT-02 classification logic
- [ ] `tests/unit/understand-route.test.ts` -- covers INPT-02 API route (mock Gemini)
- [ ] `tests/unit/analyze-route.test.ts` -- covers ORCH-03 API route (mock Supabase + Trigger.dev)
- [ ] `tests/unit/NicheInput.test.tsx` -- covers INPT-01 component rendering (needs jsdom environment)
- [ ] `tests/unit/ConfirmationCard.test.tsx` -- covers INPT-03, INPT-04 component behavior

**Note:** Testing API routes requires mocking external dependencies (Gemini, Supabase, Trigger.dev SDK). Use `vi.mock()` to mock:
- `@/lib/ai/understand` (understandNiche function)
- `@/lib/supabase/queries` (createAnalysis, updateAnalysis)
- `@trigger.dev/sdk` (tasks.trigger)

Component tests require adding `environment: 'jsdom'` in vitest config or using `// @vitest-environment jsdom` comments per file.

## Open Questions

1. **URL classification scope in Phase 2**
   - What we know: D-22 says URL inputs should "scrape the site/profile FIRST via Apify or fetch, extract niche automatically"
   - What's unclear: Apify scraping is Phase 3+. Should Phase 2 do a basic fetch() on the URL to extract title/meta, or just acknowledge the URL and let the user manually describe?
   - Recommendation: For Phase 2, detect URL, acknowledge it ("Vamos analisar seu site"), but return a generic interpretation. Store the URL for Phase 3 scraping. Do not call Apify in Phase 2.

2. **publicAccessToken storage for the analysis shell page**
   - What we know: tasks.trigger() returns publicAccessToken. The /analysis/[id] page will need it for useRealtimeRun.
   - What's unclear: How to pass the token from the API response to the analysis page after redirect.
   - Recommendation: Return the token in the API response JSON. The client stores it in localStorage keyed by analysisId before redirecting. The analysis shell page reads it from localStorage. Alternative: pass as URL query parameter.

3. **jsdom for component tests**
   - What we know: Current vitest.config.ts uses `environment: 'node'`. Component tests need jsdom.
   - Recommendation: Add `// @vitest-environment jsdom` directive at the top of component test files rather than changing the global config (which would affect API route tests that need Node environment).

## Environment Availability

Step 2.6: No new external dependencies beyond what Phase 1 already verified. All tools (Node.js 20, npm, Vitest, Next.js dev server) are available. The phase uses Gemini API and Supabase which are cloud services accessed via environment variables. Trigger.dev requires the dev CLI (`npx trigger.dev@latest dev`) to be running for local testing of task triggers.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/ai/understand.ts`, `src/lib/ai/prompts.ts`, `src/types/analysis.ts`, `src/lib/supabase/queries.ts`, `src/utils/validators.ts` -- verified by reading actual files
- [Trigger.dev Next.js setup guide](https://trigger.dev/docs/guides/frameworks/nextjs) -- tasks.trigger() pattern from API routes
- [Trigger.dev Realtime authentication](https://trigger.dev/docs/realtime/auth) -- publicAccessToken auto-generated on trigger
- [Trigger.dev Run metadata](https://trigger.dev/docs/runs/metadata) -- metadata.set() for progress tracking
- [Trigger.dev React hooks overview](https://trigger.dev/docs/realtime/react-hooks/overview) -- useRealtimeRun hook pattern
- [Gemini Structured Output docs](https://ai.google.dev/gemini-api/docs/structured-output) -- responseMimeType + responseJsonSchema with Zod
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) -- v1.46.x, ai.models.generateContent() API

### Secondary (MEDIUM confidence)
- [Trigger.dev nextjs-realtime-simple-demo](https://github.com/triggerdotdev/nextjs-realtime-simple-demo) -- Complete flow pattern for server action -> trigger -> realtime frontend
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) -- "use client" patterns for form submission
- Phase 1 research: `.planning/research/PITFALLS.md`, `.planning/research/ARCHITECTURE.md` -- Pitfalls 3 (Gemini rate limits), 4 (Vercel timeout), 5 (structured output bugs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed from Phase 1, versions verified in package.json
- Architecture: HIGH -- patterns verified against Trigger.dev docs, existing codebase patterns established
- Pitfalls: HIGH -- built on Phase 1 PITFALLS.md research + specific Phase 2 concerns identified from CONTEXT.md decisions
- Input classification: MEDIUM -- the word count thresholds (2/30) are heuristic; may need tuning with real inputs

**Research date:** 2026-03-27
**Valid until:** 2026-04-10 (stable stack, no expected breaking changes in 2 weeks)
