# OAuth Guide UI

A Next.js + TypeScript UI prototype using Tailwind CSS and shadcn Base UI (Nova), with Phase 1 agent configuration and Phase 2 bounded research.

## Run

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js. No API keys or environment variables are required for the current UI or static example.

## Agent foundation — Phase 1

- `lib/agent/model.ts` exports the server-only `createResearchModel()` factory using LangChain's Gemini adapter. Set `GOOGLE_API_KEY` and `GEMINI_MODEL` in `.env.local` or Vercel's environment settings. See `.env.example`.
- Configuration is checked only when the factory is called. Errors name missing variables without printing their values. The factory does not invoke the model or check remote availability; authentication, model access, and network failures can only be confirmed on a future invocation.
- `lib/agent/schema.ts` exports the research input, claim, source, and guide schemas with inferred TypeScript types. Existing UI scenario types reuse the research input contract.
- Unknown effort and approval durations have `status: 'unknown'`, `value: null`, and an explanation. Estimates and documented durations carry their basis and source references.
- Claims distinguish documented, estimated, and uncertain evidence. Source records distinguish search excerpts from page text. Citation existence, uniqueness, and factual support will be checked in Phase 3; schema validation alone does not verify evidence.

No live model call has been made during implementation. Phase 2 adds the research loop below. Guide generation, the streaming endpoint, and persistence remain later phases.

## Research — Phase 2

`lib/agent/research.ts` exports `researchProvider(input, { signal?, onActivity? })`. Each invocation creates its own tools and evidence store. The result contains preliminary findings, unknowns, collected sources, and a status of `researched`, `partial`, or `clarification_required`. Findings are not a verified or finished setup guide.

Agent instructions and tool descriptions live in `lib/agent/prompts/*.md`. The server-only loader reads them from the project root; Next.js tracing includes these files in deployed functions. `research-tools.ts` handles tool limits and evidence collection, while `search-web.ts` and `read-page.ts` handle retrieval. Research and guide schemas live together in `schema.ts`.

To try it locally, use Node.js 22.9+ (Node.js 24 is used for development), copy `.env.example` to `.env.local`, and fill in `GOOGLE_API_KEY`, `GEMINI_MODEL`, and `PERPLEXITY_API_KEY`. Choose a Gemini model supporting tool calling and structured output. Then run:

```sh
npm run research -- "GitHub" "Read repository issues" "My team"
```

This command makes real, potentially billable Gemini and Perplexity requests. Activity goes to stderr and the JSON result goes to stdout. Ctrl+C requests cancellation. A partial result exits with code 1 while retaining evidence; a clarification response includes a question to resolve before rerunning. To save just the JSON, invoke the script directly without npm's banner:

```sh
node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/research.ts "GitHub" "Read repository issues" "My team" > /tmp/auth-assist-research.json
```

The CLI uses the `react-server` condition to resolve Next.js's `server-only` marker outside Next.js. There is no public research API or UI connection yet. The installed LangChain and provider credentials are used only when you run research.

Limits: four searches, six page reads, a 90-second run budget, 15 seconds per search, 12 seconds per page including redirects, up to three redirects, 1 MB search responses, and 2 MB page responses. Retained excerpts are capped at 4,000 characters per search result and 16,000 per page. Pages are fetched using validated, pinned public IP addresses. HTML and plain text are supported; PDFs, login-required pages, and JavaScript rendering are not. Search excerpts and page text remain distinct evidence types. Sources are not automatically fact-checked in this phase.

Missing configuration fails before research starts. Access errors, budgets, malformed output, and network failures produce gaps or partial results. No live model/search trials or browser checks have been run; TypeScript checking is the implementation validation.

## Screens

- `/`: enter an app name or website, an optional use case, and an audience.
- `/workspace`: form context is passed through URL query parameters. Submitting messages only appends user messages locally.
- `/workspace?example=true`: a labelled, fixed example with expandable activity, guide sections, and a working sample checklist.

Desktop uses conversation and guide columns; smaller screens use Chat/Guide tabs. Enter sends a message and Shift+Enter adds a newline. Blank messages cannot be sent.

## Boundaries

The UI is not connected to the model factory. There is no UI-facing research endpoint, database, authentication, or generated UI response. Example content is generic and contains no verified provider requirements or citations. Messages, drafts, and checklist changes live in React state and reset on refresh. Form context is visible in the URL; do not enter credentials.

The example content is in `lib/example.ts`; the setup form, workspace, conversation panel, and guide preview are separate components. The composer follows the shadcn AI Elements Input Group composition. Existing repository configuration and pre-existing deletions were preserved.

## Validation

```sh
npm run typecheck
```

TypeScript checking passed. No automated tests, full lint, or browser automation were run. Visual and browser interaction verification remain outstanding.
