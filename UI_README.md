# OAuth Guide UI

A Next.js + TypeScript UI prototype using Tailwind CSS and shadcn Base UI (Nova), with Phase 1 agent configuration and schemas.

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

No live model call has been made. The agent loop, Perplexity tools, guide generation, streaming endpoint, and persistence are later phases. `PERPLEXITY_API_KEY` is documented but not used yet.

## Screens

- `/`: enter an app name or website, an optional use case, and an audience.
- `/workspace`: form context is passed through URL query parameters. Submitting messages only appends user messages locally.
- `/workspace?example=true`: a labelled, fixed example with expandable activity, guide sections, and a working sample checklist.

Desktop uses conversation and guide columns; smaller screens use Chat/Guide tabs. Enter sends a message and Shift+Enter adds a newline. Blank messages cannot be sent.

## Boundaries

The UI is not connected to the model factory. There is no research backend, database, authentication, or generated response. Example content is generic and contains no verified provider requirements or citations. Messages, drafts, and checklist changes live in React state and reset on refresh. Form context is visible in the URL; do not enter credentials.

The example content is in `lib/example.ts`; the setup form, workspace, conversation panel, and guide preview are separate components. The composer follows the shadcn AI Elements Input Group composition. Existing repository configuration and pre-existing deletions were preserved.

## Validation

```sh
npm run typecheck
```

TypeScript checking passed. No automated tests, full lint, or browser automation were run. Visual and browser interaction verification remain outstanding.
