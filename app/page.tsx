import { Wizard } from "@/components/Wizard";
import { Bezel, Eyebrow } from "@/components/ui";
import { DOCS, DOC_ORDER } from "@/lib/types";

export default function Home() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <Nav />
      <Hero />
      <Documents />
      <Wizard />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-30 mx-auto mt-6 flex w-max items-center gap-1 rounded-full bg-ivory/70 px-2 py-2 shadow-[0_20px_45px_-32px_rgba(23,59,70,0.6)] ring-1 ring-fjord/10 backdrop-blur-xl">
      <span className="px-4 font-display text-lg tracking-tight">Preparation</span>
      <span className="h-5 w-px bg-fjord/10" />
      <a
        href="#documents"
        className="rounded-full px-4 py-1.5 text-[13px] text-ink-muted transition-colors duration-300 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
      >
        The four files
      </a>
      <a
        href="#start"
        className="rounded-full bg-fjord px-4 py-1.5 text-[13px] text-ivory transition-colors duration-300 hover:bg-fjord-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
      >
        Start
      </a>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto flex min-h-[80dvh] w-full max-w-6xl flex-col justify-center px-4 py-28 sm:px-6 md:py-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10%] top-[10%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(228,99,84,0.16),transparent_65%)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-15%] bottom-0 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(113,147,159,0.22),transparent_65%)] blur-3xl"
      />

      <div className="rise relative grid gap-12 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <Eyebrow>Before the first line of code</Eyebrow>
          <h1 className="mt-7 max-w-5xl font-display text-[clamp(2.75rem,6.5vw,5rem)] leading-[0.95] tracking-tight">
            Your agent cannot stay in scope
            <span className="text-storm"> it was never given.</span>
          </h1>
          <p className="mt-7 max-w-lg text-[16px] leading-relaxed text-ink-muted">
            Describe an idea. Answer the questions it raises. Leave with four documents
            your coding agent reads before every task, so it builds the thing you asked
            for instead of the statistical average of everything.
          </p>
        </div>

        <div className="md:col-span-5">
          <Bezel tone="dark">
            <div className="p-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-storm">
                Repository root
              </p>
              <ul className="mt-5 space-y-3">
                {DOC_ORDER.map((id) => (
                  <li key={id} className="flex items-baseline gap-3">
                    <span className="font-mono text-[13px] text-ivory">
                      {DOCS[id].filename}
                    </span>
                    <span className="h-px flex-1 bg-ivory/15" />
                    <span className="text-[12px] text-storm">{DOCS[id].title}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[13px] leading-relaxed text-ivory/60">
                Downloaded with these exact names, so they drop straight into a project
                and stay loaded across sessions.
              </p>
            </div>
          </Bezel>
        </div>
      </div>
    </section>
  );
}

function Documents() {
  return (
    <section id="documents" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
      <div className="max-w-2xl">
        <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Four files. Written in order, because each one needs the last.
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">
          Generated in parallel, these documents contradict each other. Generated in
          sequence, each stage reads the one you just corrected. There is no
          architecture.md: at this size it produces boxes that say nothing the code does
          not, so stack, auth and hosting live in the PRD where they get read.
        </p>
      </div>

      <div className="mt-14 grid auto-rows-auto grid-flow-dense gap-4 md:grid-cols-12">
        <Card
          className="md:col-span-7"
          index="PRD.md"
          title="Scope that says no"
          body="Problem, users, MVP features with checkable acceptance conditions, and an Out of Scope list naming the adjacent features nobody is building. A negative constraint steers an agent harder than a positive one, because a feature list is silent about everything it omits."
        />
        <Card
          className="md:col-span-5"
          index="design.md"
          title="Tokens, not adjectives"
          body="Hex values with measured contrast ratios, a type scale, spacing, easing curves, and per-component states. Prose about a clean modern aesthetic is itself the slop this file exists to prevent."
        />
        <Card
          className="md:col-span-5"
          index="schema.md"
          title="The expensive one"
          body="Tables, an ERD, indexes tied to the query each serves, and row-level security policies. Carries a draft banner, because a wrong relation is cheap now and costly once data exists. Skipped when the project has no database."
        />
        <Card
          className="md:col-span-7"
          index="rules.md"
          title="Written by hand, not rolled fresh"
          body="SOLID, KISS, and DRY as the rule of three restricted to code that changes for the same reason. Two files that merely look alike are coincidentally similar, and merging them couples unrelated parts of the system until the shared function grows five boolean flags."
        />
      </div>
    </section>
  );
}

function Card({
  index,
  title,
  body,
  className,
}: {
  index: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <Bezel className={className}>
      <div className="flex h-full flex-col p-7 sm:p-8">
        <code className="font-mono text-[12px] text-coral">{index}</code>
        <h3 className="mt-4 font-display text-[26px] leading-tight tracking-tight">
          {title}
        </h3>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{body}</p>
      </div>
    </Bezel>
  );
}

function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
      <Bezel tone="dark">
        <div className="grid gap-10 p-8 sm:p-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl leading-tight tracking-tight text-ivory sm:text-4xl">
              These files help only while they stay true.
            </h2>
            <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-ivory/65">
              Doc drift is the real failure mode. Once code exists and diverges, a stale
              schema.md causes wrong code precisely because it is trusted. Fix the
              document in the same commit as the change that broke it.
            </p>
          </div>
          <div className="md:justify-self-end">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-storm">
              What this does not promise
            </p>
            <ul className="mt-5 space-y-3 text-[14px] leading-relaxed text-ivory/65">
              <li>A vague idea in still yields a vague PRD out.</li>
              <li>The shape is guaranteed; the content still needs your judgement.</li>
              <li>Free model tiers cap output length. Truncation is reported, not hidden.</li>
            </ul>
          </div>
        </div>
      </Bezel>
    </footer>
  );
}
