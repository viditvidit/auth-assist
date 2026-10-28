# Agent limitations

This prototype researches public documentation to produce OAuth setup guides. It helps developers understand what to do next, but cannot guarantee a successful setup or approval. See [DECISIONS.md](DECISIONS.md) for the reasoning behind these choices.

## Evidence

- **Citations can be wrong.** The agent checks citations and reviews claims against their sources, but it can still misunderstand a page. Earlier runs invented citation IDs; validation was added to catch them. [Decision](DECISIONS.md#citation-validation-and-automatic-guide-saving)
- **Some pages cannot be read.** The agent reads public HTML and plain text. It cannot read PDFs, pages behind login, or pages that need JavaScript. Long pages are shortened, which can leave out important details. [Boundary](DECISIONS.md#boundaries) · [Page reader](lib/agent/read-page.ts)
- **Sources can be outdated or disagree.** The agent prefers official documentation and labels community reports as experiences. A retrieval date does not guarantee that a source is current or applies to every account. [Evidence decisions](DECISIONS.md#evidence)
- **“Complete” does not mean tested.** It means the agent found no known major gap in the guidance. It can still miss a requirement, and approval is not guaranteed. [Decision and GitHub example](DECISIONS.md#approval-applicability-and-targeted-research)

## Research

- **Research time and calls are limited.** Each run can make up to four searches and read six pages. This keeps generation bounded, but complex providers may need more research. Failed attempts also use the budget. [Decision](DECISIONS.md#recovery-before-a-partial-guide)
- **Missing details can change the answer.** Permissions, audience, and organization settings affect the setup path. The agent may not always ask for the right clarification. For example, an earlier Gmail guide wrongly assumed that “My team” qualified for an internal app; the guidance was updated. [Decision and Gmail example](DECISIONS.md#optional-audience-and-explanatory-diagrams)
- **Approval times may be unknown.** Provider review, admin approval, marketplace listing, and user consent are different processes. The agent does not assume review is unnecessary or invent a waiting time when evidence is missing. [Decision](DECISIONS.md#approval-applicability-and-targeted-research)

## Execution

- **The agent does not complete setup.** It researches documentation. A person must handle login, credentials, registration, payments, and submissions. Reading a guide does not prove a connection works. [Boundary](DECISIONS.md#boundaries)
- **A run can fail.** Timeouts, inaccessible pages, provider errors, or invalid model output can stop generation. The system may retain an already-reviewed partial guide, but an early failure can prevent a guide from being delivered. [Recovery decision](DECISIONS.md#recovery-before-a-partial-guide) · [Generation flow](lib/agent/generate-guide.ts)
- **Follow-up context is temporary.** Saved research context expires and has size limits, so a later follow-up may need fresh research. Its signature confirms where it came from, not whether it is correct. [Decision](DECISIONS.md#follow-up-research-context)
- **External content can be malicious.** The agent is instructed to treat pages and conversation as data, not instructions. This reduces prompt-injection risk but does not eliminate it. [Boundary](DECISIONS.md#boundaries)

Check the cited provider documentation for your account, permissions, and intended audience before making important setup or approval decisions.
