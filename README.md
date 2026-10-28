# Auth Assist

Auth Assist helps developers understand how to set up an OAuth app for an integration. Enter a provider and what you want to build, and the agent researches the setup path, required permissions, approval conditions, and next steps.

## Features

- **Live research:** Investigates an app by name or website, including providers outside the example library. The agent can ask for clarification when a provider is ambiguous.
- **Scenario-specific guides:** Tailors guidance to the intended use and optional audience, with prerequisites, setup steps, blockers, and human handoffs.
- **Evidence and uncertainty:** Links claims to collected sources, labels estimates and unknowns, and distinguishes provider review, organization approval, and marketplace listing. Guides are marked complete or partial based on the remaining material gaps.
- **Follow-up research:** Ask questions or add context to refine a guide. The agent can investigate unresolved gaps and produce another version.
- **Library and sharing:** Browse example guides, switch between versions, view Markdown, and copy a shareable link. Generated guides are saved in the database.
- **Your own API keys:** Optionally provide Gemini and Perplexity keys using **API keys**. They stay in page memory until refresh and are sent to the server with research requests. Empty fields use the server configuration.

## How to use

1. Enter an app name or website and describe what your integration should do. Optionally select who will connect.
2. Select **Research**. Follow the research activity and answer any clarification questions.
3. Read the guide, check its citations, and review any partial-guide reasons or unknowns. On smaller screens, open the **Guide** tab.
4. Ask a follow-up question to refine the guidance. Use the version selector to revisit an earlier guide.
5. Select **Share** to copy a link, or **View Markdown** to see the guide text. Use **Library** to browse examples and **Guides** to reopen research in the current tab.

The agent researches documentation; a person must handle sign-in, credentials, registration, payments, and approval submissions. A complete guide is not proof that setup or approval succeeded. Conversation history and research references are kept in the current browser tab; shared guide links open the saved guide independently.

## Run locally

Requires Node.js 22.9 or newer, npm, Google AI Studio and Perplexity API access, and a Supabase Postgres database. Model and search requests may incur charges.

1. Install dependencies and create a local environment file:

   ```sh
   npm ci
   cp .env.example .env.local
   ```

2. Set the server-side values in `.env.local`:

   | Variable | Purpose |
   | --- | --- |
   | `GOOGLE_API_KEY` | Google AI Studio API key; also used to sign research context |
   | `GEMINI_MODEL` | Gemini model ID with tool calling and structured output support |
   | `PERPLEXITY_API_KEY` | Perplexity Search API key |
   | `OAUTH_GUIDES_DATABASE_URL` | Supabase transaction-pooler Postgres connection URL |

   Users can provide their own Gemini and Perplexity keys in the app. The server still needs `GOOGLE_API_KEY` for signing and `GEMINI_MODEL` to select a model. Gemini offers a free tier for eligible models, subject to quota; Perplexity has separate pricing and limits.

3. Apply [database/guide-schema.sql](database/guide-schema.sql) once to a new Supabase project using its SQL editor. The app uses a server-side database connection to save and retrieve guides. The example library can be empty until example guides are added.
4. Start the app:

   ```sh
   npm run dev
   ```

   Open the local URL printed by Next.js. Live research and saving require the configuration above.

## How it works

The Next.js server uses LangChain and Gemini to research a scenario, Perplexity to find sources, and a public-page reader to collect evidence. It generates a structured guide, reviews claims against the collected sources, and stores the result in Postgres. The review is model-assisted and does not guarantee that a claim is correct.

- [DECISIONS.md](DECISIONS.md) explains the product and agent decisions, including changes made after observed issues.
- [LIMITATIONS.md](LIMITATIONS.md) describes the boundaries and remaining risks of the agent.
