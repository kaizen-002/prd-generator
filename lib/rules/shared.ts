/**
 * Static rules content. No LLM call — these principles are identical on every
 * project, so rolling them fresh each time spends tokens to get a worse file.
 * Only the stack-specific section varies.
 */

export const RULES_CORE = `# Coding Rules

These rules are binding for all code in this repository. When a rule conflicts with
a request, say so before writing the code rather than silently breaking the rule.

## SOLID

### Single Responsibility
A module has one reason to change. The test is not "is this file short" — it is
"can I name a single actor whose changing needs would force me to edit this file".
If billing changes and formatting changes both land in the same file, split it.

Violation: a \`UserService\` that validates input, writes to the database, and sends
the welcome email. Three actors, three reasons to change.

### Open/Closed
Extend behaviour by adding code, not by editing a working branch statement.
When a \`switch\` over a type gains a fourth case, that is the signal to move to a
lookup table or polymorphism — not on the first case.

### Liskov Substitution
Any implementation of an interface must be usable wherever that interface is
expected, without the caller checking which one it got. If a caller needs
\`if (impl instanceof X)\`, the abstraction is wrong.

### Interface Segregation
Callers depend only on the methods they use. A five-method interface where every
consumer uses two is three methods of false coupling. Prefer several small
interfaces over one broad one.

### Dependency Inversion
Business logic depends on abstractions; the concrete adapter is injected at the
edge. The core must not import the database driver, the HTTP client, or the
file system directly.

**This rule and KISS pull against each other, and the conflict is real.** KISS
forbids an abstraction with one implementation; Dependency Inversion asks for a
seam at every external boundary, and early on every one of those seams has exactly
one adapter. Read literally, the two deadlock and the first feature stalls in a
style argument.

Resolution: a port is justified when it buys something **today**, and the usual
thing it buys is a test that runs without the network, a model, a browser or a
database. That is a present benefit, which is what KISS asks for; KISS forbids
speculative generality, not seams that pay now. So:

- List the ports explicitly, with the adapter and the reason each seam exists.
- Keep the list closed. A new port needs a recorded decision, not a preference.
- A seam justified only by "we might swap it later" is the speculative kind. Do
  not build it.

## DRY — rule of three, same reason to change

Duplicate code is not automatically a defect. Abstract only when **both** hold:

1. The pattern has appeared three times, and
2. All three copies would have to change **for the same reason**.

If two pieces of code look alike but change for different reasons, they are
coincidentally similar, not duplicated. Merging them couples two unrelated parts
of the system, and the next change forces a parameter flag — then another — until
the shared function has five booleans and nobody can safely edit it. That coupling
is more expensive than the duplication it removed.

When in doubt, wait for the third occurrence. Duplication is cheap to fix;
a wrong abstraction is not.

## KISS

Ship the simplest implementation that satisfies the acceptance criteria in PRD.md.

- No abstraction layer with exactly one implementation, unless a second is already scheduled.
- No configuration option nobody has asked for.
- No caching, queueing, or batching before a measurement shows it is needed.
- Solve the case in front of you. Generality added speculatively is usually wrong,
  and it is always harder to delete than to add.

## Numbers must be computed

No measurement, ratio, duration or performance figure enters a document, a comment
or a commit message unless something produced it. If it cannot be computed yet,
give the range and mark it an estimate.

Asserted numbers read exactly like measured ones and are wrong far more often. A
contrast table nobody ran, or a latency target nobody divided into stages, will be
trusted by everyone downstream and is worse than an empty cell.

## Working agreements

- **Scope.** Read PRD.md before starting a feature. If the work is not in MVP Scope,
  stop and say so. If it appears in Out of Scope, refuse and explain.
- **Design.** Read design.md before writing UI, and before writing any renderer
  that produces a visual artefact the product ships. Use the defined tokens. Never
  introduce a raw hex, size, or duration outside the token set. If the product
  renders its own output, those tokens are tokens too — the renderer emits them,
  it does not invent values.
{{DATA_RULE}}
- **The documents are one set.** They are read together, so check a change against
  all of them, not only the one you edited. Each can be internally plausible while
  contradicting the others — a constraint that forbids a feature, a design system
  the chosen stack cannot express, a rule pointing at a file that does not exist.
  Those only surface when the set is read as a whole.
- **Docs follow code.** If a change makes any of these documents wrong, fix the
  document in the same commit. A stale document is worse than a missing one,
  because it will be trusted.
- **Errors.** Handle the failure path explicitly. No empty catch blocks. No error
  swallowed to make a test pass.
- **Naming.** Names state intent. \`data\`, \`temp\`, \`handleClick2\`, and \`utils\` are
  not names.
- **Comments.** Comment why, not what. Delete commented-out code rather than
  leaving it.
`;

export const RULES_STACKS: Record<string, { label: string; body: string }> = {
  generic: {
    label: "Language-agnostic",
    body: `## Stack conventions

- Keep the dependency count low. Every dependency is a maintenance and security
  obligation; prefer the standard library where it is adequate.
- Pin versions. Reproducible installs are not optional.
- Fail fast at startup on missing configuration, rather than at the first request.
- Secrets come from the environment. A key in source control is a key that must be
  rotated.
`,
  },

  nextjs: {
    label: "Next.js / React / TypeScript",
    body: `## Stack conventions — Next.js, React, TypeScript

### Server and client boundary
- Server Components are the default. Add \`"use client"\` only for a component that
  needs state, effects, or browser APIs, and push it as far down the tree as it goes.
- Secrets, API keys, and database access exist only in server code. Anything a
  client component imports is shipped to the browser — check that import chain
  before adding a key to a module.
- Fetch data in the server component that renders it. Do not prop-drill data
  through client components to reach a leaf.

### TypeScript
- \`strict\` stays on. \`any\` requires a comment justifying it; prefer \`unknown\` plus
  a narrowing check.
- Type at the boundary. Anything crossing the network is validated at runtime,
  not merely asserted with \`as\`.
- Derive types from a single source rather than declaring the same shape twice.

### React
- Effects synchronise with something external. Deriving state from props inside an
  effect is a bug — compute it during render.
- Keys are stable identifiers from the data. Never an array index for a reorderable list.
- Memoise only after a measurement. \`useMemo\` on a cheap computation costs more
  than it saves.
- Every interactive element is reachable and operable by keyboard, with a visible
  focus ring.

### Styling
- Tailwind utilities compose the tokens defined in design.md. No arbitrary values
  for colour, spacing, or duration that bypass the token set.
- Conditional class strings go through one helper, not nested ternaries in JSX.
`,
  },

  python: {
    label: "Python",
    body: `## Stack conventions — Python

- Type hints on every public function. Run a type checker in CI; hints that are
  not checked drift immediately.
- Data structures are dataclasses or Pydantic models, not bare dicts passed between
  layers. A dict is an untyped contract.
- Virtual environment plus a lock file. Never install into the system interpreter.
- Exceptions are specific. Bare \`except:\` is banned; \`except Exception\` needs a
  comment saying why that breadth is correct.
- I/O lives at the edges. Core logic takes values and returns values so it can be
  tested without a database or network.
- Format and lint with a single configured tool. Style is not a code-review topic.
`,
  },

  node: {
    label: "Node / TypeScript API",
    body: `## Stack conventions — Node, TypeScript

- ES modules, \`strict\` TypeScript, no implicit \`any\`.
- Validate every external input at the boundary with a schema. Trust nothing that
  arrived over the wire, including from your own frontend.
- Configuration is read once at startup into a typed, frozen object. No scattered
  \`process.env\` reads inside request handlers.
- Every async path handles rejection. An unhandled rejection is a crash.
- Layer the code: route handler parses and responds, service holds the logic,
  repository talks to the database. A route handler must not contain SQL.
`,
  },
};

const DATA_RULE_WITH_DB = `- **Schema.** Read schema.md before touching the database. Schema changes are
  migrations, never manual edits.`;

const DATA_RULE_NO_DB = `- **Storage.** This project has no database and no schema.md. State lives in
  files or in memory. Say where each artefact is written and when it is deleted —
  a process that only ever writes will eventually fill the disk.`;

/**
 * Assembles rules.md for the chosen stack. No model involved.
 *
 * `hasDatabase` matters because the storage rule is otherwise a dead pointer: a
 * project with no database was still told to read a schema.md the generator had
 * deliberately not produced. A rule pointing at a missing file teaches the reader
 * that the rules are decorative.
 */
export function buildRules(stackKey: string, hasDatabase = true): string {
  const stack = RULES_STACKS[stackKey] ?? RULES_STACKS.generic;
  const core = RULES_CORE.replace(
    "{{DATA_RULE}}",
    hasDatabase ? DATA_RULE_WITH_DB : DATA_RULE_NO_DB,
  );
  return `${core}\n${stack.body}`;
}
