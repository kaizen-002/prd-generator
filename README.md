# Preparation

Turns a product idea into four documents a coding agent reads before every task:
`PRD.md`, `design.md`, `schema.md`, and `rules.md`.

## Why it is staged and not one-shot

A one-line idea does not contain enough information to write a real PRD. Generating
one anyway produces confident fiction. So the flow is:

```
idea -> interview -> PRD.md -> design.md -> schema.md
                                            rules.md (static, no model call)
```

Each stage reads the **user-edited** output of the stage before it. Generating them
in parallel produces documents that contradict each other.

`architecture.md` is deliberately absent. At this project size it produces generic
boxes; the content that matters (stack, auth model, hosting) lives in the PRD's
Technical Requirements section, which is where it actually gets read.

`schema.md` is skipped when the project has no database. A file describing tables
that do not exist is worse than no file, because an agent will build against it.

`rules.md` is a hand-written template with a stack-specific section. The principles
are identical on every project, so regenerating them each time spends tokens to get
a worse file.

## Setup

```bash
cp .env.example .env.local
```

Fill in one key, or both:

- Gemini: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys

`LLM_PROVIDER` names the one tried first. If both keys are present, the other is
used automatically when the first returns a quota error (429) or is down (5xx).
An invalid key is **not** failed over — that is a configuration mistake and should
be loud. Set `LLM_FALLBACK=off` to disable failover entirely.

Failover only happens before the first token reaches the browser. Once part of a
document has streamed, a failure is reported rather than retried, because
restarting on another model would splice two different documents together.

### Models

| Provider | Default | Why |
|---|---|---|
| Gemini | `gemini-2.5-flash` | Long structured markdown at a generous free tier. The PRD and design documents are the long ones, so output ceiling matters more than raw reasoning here. |
| Groq | `openai/gpt-oss-120b` | Holds a strict output contract well and is very fast, which suits a fallback. |

Both are overridable with `GEMINI_MODEL` / `GROQ_MODEL`. Free-tier model
availability changes often — if a request 404s on the model name, check the
provider's current model list and set the env var.

Then:

```bash
npm install
npm run dev
```

Keys are read only in server route handlers. Nothing in `lib/llm.ts` is imported by
client code.

## Layout

| Path | What lives there |
|---|---|
| `lib/prompts/` | The system prompts. This is the product; the app around it is a shell. |
| `lib/rules/shared.ts` | Static `rules.md` content, per stack. |
| `lib/llm.ts` | Gemini and Groq behind one streaming interface, plain `fetch`. |
| `app/api/interview/` | Idea to questions. Returns JSON. |
| `app/api/generate/` | Streams one document per request. |
| `components/Wizard.tsx` | The three-step flow and all its state. |

## Using the output

Put the downloaded files at your repository root, then add to `CLAUDE.md`:

```
Read PRD.md before any feature work.
Read design.md before writing UI.
Read schema.md before any database change.
rules.md is binding for all code.
```

Without that, the documents only apply when you paste them into a session.

## The failure mode to watch

Doc drift. These files help while they stay true and hurt once they do not, because
they are trusted. When a change makes one wrong, fix the document in the same commit.

## Known limits

- Free model tiers cap output length. Truncation is reported inline rather than
  hidden, but a very long PRD can still hit it.
- The rate limit in `lib/ratelimit.ts` is in-memory, so it is per instance. Move the
  counter to a shared store before running more than one.
- The site guarantees document shape, not correctness. A vague idea still yields a
  vague PRD.
