"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { buildRules, RULES_STACKS } from "@/lib/rules/shared";
import { downloadBundle, type BundleEntry } from "@/lib/download";
import { DOCS, type Answer, type InterviewQuestion, type Stage } from "@/lib/types";
import { ArrowGlyph, Bezel, Button, Eyebrow } from "./ui";
import { DocPanel } from "./DocPanel";

type Step = "idea" | "interview" | "docs";

export function Wizard() {
  const [step, setStep] = useState<Step>("idea");
  const [idea, setIdea] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [asking, setAsking] = useState(false);

  const [hasDatabase, setHasDatabase] = useState(true);
  const [stack, setStack] = useState("nextjs");
  const [brandNotes, setBrandNotes] = useState("");

  const [prd, setPrd] = useState("");
  const [design, setDesign] = useState("");
  const [schema, setSchema] = useState("");
  const [busy, setBusy] = useState<Stage | null>(null);

  const docsRef = useRef<HTMLDivElement>(null);

  const rules = useMemo(() => buildRules(stack, hasDatabase), [stack, hasDatabase]);

  /*
   * Everything with content, in repository order. schema.md is left out entirely
   * when the project has no database rather than shipped empty.
   */
  const bundle: BundleEntry[] = useMemo(() => {
    const entries: BundleEntry[] = [
      { filename: DOCS.prd.filename, content: prd },
      { filename: DOCS.design.filename, content: design },
    ];
    if (hasDatabase) entries.push({ filename: DOCS.schema.filename, content: schema });
    entries.push({ filename: DOCS.rules.filename, content: rules });
    return entries.filter((e) => e.content.trim());
  }, [design, hasDatabase, prd, rules, schema]);

  const answers: Answer[] = useMemo(
    () => questions.map((q) => ({ question: q.question, answer: replies[q.id] ?? "" })),
    [questions, replies],
  );

  const answeredCount = answers.filter((a) => a.answer.trim()).length;

  /** Stage 0 - turn the raw idea into questions. */
  const startInterview = useCallback(async () => {
    setError(null);
    setAsking(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Interview failed.");
      setQuestions(data.questions);
      setStep("interview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interview failed.");
    } finally {
      setAsking(false);
    }
  }, [idea]);

  /**
   * Stages 1-3. Each reads the *edited* text of the stage before it, so a
   * correction the user makes propagates instead of being silently discarded.
   */
  const runStage = useCallback(
    async (stage: Stage) => {
      setError(null);
      setBusy(stage);
      const setters = { prd: setPrd, design: setDesign, schema: setSchema };
      const write = setters[stage];
      write("");

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            stage,
            idea,
            answers,
            prd,
            brandNotes: stage === "design" ? brandNotes : undefined,
          }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed (${res.status}).`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          write(acc);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed.");
      } finally {
        setBusy(null);
      }
    },
    [answers, brandNotes, idea, prd],
  );

  async function beginDocs() {
    setStep("docs");
    requestAnimationFrame(() =>
      docsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    await runStage("prd");
  }

  return (
    <section id="start" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-40">
      {error ? (
        <div
          role="alert"
          className="mx-auto mb-10 max-w-3xl rounded-2xl bg-coral/10 px-5 py-4 text-sm text-coral-deep ring-1 ring-coral/25"
        >
          {error}
        </div>
      ) : null}

      {step === "idea" ? (
        <IdeaStep idea={idea} setIdea={setIdea} asking={asking} onSubmit={startInterview} />
      ) : null}

      {step === "interview" ? (
        <InterviewStep
          questions={questions}
          replies={replies}
          setReplies={setReplies}
          answeredCount={answeredCount}
          hasDatabase={hasDatabase}
          setHasDatabase={setHasDatabase}
          stack={stack}
          setStack={setStack}
          brandNotes={brandNotes}
          setBrandNotes={setBrandNotes}
          onBack={() => setStep("idea")}
          onSubmit={beginDocs}
        />
      ) : null}

      {step === "docs" ? (
        <div ref={docsRef} className="space-y-8">
          <header className="mx-auto max-w-2xl text-center">
            <Eyebrow>Stage three</Eyebrow>
            <h2 className="mt-5 font-display text-4xl tracking-tight sm:text-5xl">
              Your documents
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              Each document is editable here, and every later stage reads what you
              edited, not the original. Correct a wrong assumption before you carry it
              forward.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                onClick={() => downloadBundle(bundle)}
                disabled={!bundle.length || !!busy}
                trailing={<ArrowGlyph />}
              >
                {busy
                  ? "Still writing"
                  : `Download all ${bundle.length} file${bundle.length === 1 ? "" : "s"}`}
              </Button>
              <p className="font-mono text-[11px] text-ink-muted">
                {bundle.length
                  ? `${bundle.map((e) => e.filename).join("  ")} — unzips into a repository root`
                  : "nothing generated yet"}
              </p>
            </div>
          </header>

          <DocPanel
            meta={DOCS.prd}
            value={prd}
            streaming={busy === "prd"}
            onChange={setPrd}
            footer={
              <div className="flex flex-wrap gap-2">
                <Button variant="quiet" onClick={() => runStage("prd")} disabled={!!busy}>
                  Regenerate
                </Button>
                <Button
                  onClick={() => runStage("design")}
                  disabled={!prd || !!busy}
                  trailing={<ArrowGlyph />}
                >
                  Write design.md from this
                </Button>
              </div>
            }
          />

          <DocPanel
            meta={DOCS.design}
            value={design}
            streaming={busy === "design"}
            onChange={setDesign}
            footer={
              hasDatabase ? (
                <Button
                  onClick={() => runStage("schema")}
                  disabled={!prd || !!busy}
                  trailing={<ArrowGlyph />}
                >
                  Write schema.md from the PRD
                </Button>
              ) : (
                <Button
                  variant="quiet"
                  onClick={() => runStage("design")}
                  disabled={!prd || !!busy}
                >
                  Regenerate
                </Button>
              )
            }
          />

          {hasDatabase ? (
            <DocPanel
              meta={DOCS.schema}
              value={schema}
              streaming={busy === "schema"}
              onChange={setSchema}
              note="draft, verify before migrating"
              footer={
                <Button
                  variant="quiet"
                  onClick={() => runStage("schema")}
                  disabled={!prd || !!busy}
                >
                  Regenerate
                </Button>
              }
            />
          ) : (
            <Bezel>
              <div className="px-8 py-10">
                <h3 className="font-display text-2xl tracking-tight">
                  Database schema skipped
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
                  You marked this project as having no database, so{" "}
                  <code className="font-mono text-[12px]">schema.md</code> is not
                  generated. A file describing tables that do not exist is worse than no
                  file, because an agent will build against it.
                </p>
              </div>
            </Bezel>
          )}

          <DocPanel
            meta={DOCS.rules}
            value={rules}
            streaming={false}
            onChange={() => {}}
            note={`${RULES_STACKS[stack]?.label ?? "generic"}, written by hand, no model`}
          />
        </div>
      ) : null}
    </section>
  );
}

/* Step one */

function IdeaStep({
  idea,
  setIdea,
  asking,
  onSubmit,
}: {
  idea: string;
  setIdea: (v: string) => void;
  asking: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <Eyebrow>Stage one</Eyebrow>
        <h2 className="mt-5 font-display text-4xl tracking-tight sm:text-5xl">
          Describe the thing you want to build
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-muted">
          A few sentences is enough. The detail comes from the questions on the next
          screen, not from you writing a brief here.
        </p>
      </div>

      <Bezel className="mt-10">
        <div className="p-2">
          <label className="sr-only" htmlFor="idea">
            Product idea
          </label>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={7}
            placeholder="A booking tool for a small climbing gym. Members reserve a slot for a session, staff see who is coming, and the gym caps how many people can be in the building at once."
            className="thin-scroll w-full resize-none bg-transparent px-6 py-5 text-[15px] leading-relaxed text-ink placeholder:text-ink-muted/55 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-fjord/[0.08] px-6 py-4">
            <span className="font-mono text-[11px] text-ink-muted">
              {idea.trim().length} characters
            </span>
            <Button
              onClick={onSubmit}
              disabled={idea.trim().length < 12 || asking}
              trailing={<ArrowGlyph />}
            >
              {asking ? "Reading your idea" : "Start the interview"}
            </Button>
          </div>
        </div>
      </Bezel>
    </div>
  );
}

/* Step two */

function InterviewStep({
  questions,
  replies,
  setReplies,
  answeredCount,
  hasDatabase,
  setHasDatabase,
  stack,
  setStack,
  brandNotes,
  setBrandNotes,
  onBack,
  onSubmit,
}: {
  questions: InterviewQuestion[];
  replies: Record<string, string>;
  setReplies: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  answeredCount: number;
  hasDatabase: boolean;
  setHasDatabase: (v: boolean) => void;
  stack: string;
  setStack: (v: string) => void;
  brandNotes: string;
  setBrandNotes: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const set = (id: string, value: string) =>
    setReplies((prev) => ({ ...prev, [id]: value }));

  /**
   * A single-answer question replaces the field; a multi-answer one toggles the
   * option in and out of a comma-separated list, so "what will you not build"
   * can take several clicks without the user retyping the earlier ones.
   */
  function chooseOption(q: InterviewQuestion, option: string) {
    const current = replies[q.id] ?? "";
    if (!q.multi) {
      set(q.id, current === option ? "" : option);
      return;
    }
    const parts = current.split(",").map((p) => p.trim()).filter(Boolean);
    const next = parts.includes(option)
      ? parts.filter((p) => p !== option)
      : [...parts, option];
    set(q.id, next.join(", "));
  }

  function isChosen(q: InterviewQuestion, option: string) {
    const current = replies[q.id] ?? "";
    if (!q.multi) return current === option;
    return current.split(",").map((p) => p.trim()).includes(option);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <Eyebrow>Stage two</Eyebrow>
        <h2 className="mt-5 font-display text-4xl tracking-tight sm:text-5xl">
          Close the gaps
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-muted">
          Every question left blank is a fact the model will invent. Skipping is allowed;
          assumptions get marked in the PRD so you can argue with them later.
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {questions.map((q, i) => (
          <Bezel key={q.id}>
            <div className="p-6 sm:p-7">
              <div className="flex gap-4">
                <span className="mt-0.5 font-mono text-[11px] text-storm">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`q-${q.id}`}
                    className="block text-[15px] font-medium leading-snug"
                  >
                    {q.question}
                  </label>
                  {q.why ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                      {q.why}
                    </p>
                  ) : null}

                  {q.options?.length ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {q.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={isChosen(q, option)}
                            onClick={() => chooseOption(q, option)}
                            className={cx(
                              "rounded-full px-3 py-1.5 text-left text-[12.5px] transition-colors duration-300",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                              isChosen(q, option)
                                ? "bg-fjord text-ivory"
                                : "bg-fjord/[0.05] text-ink-muted ring-1 ring-fjord/10 hover:bg-fjord/[0.09]",
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-[12px] text-ink-muted">
                        {q.multi
                          ? "Pick as many as apply, or write your own below."
                          : "Pick one, or write your own below."}
                      </p>
                    </>
                  ) : null}

                  <textarea
                    id={`q-${q.id}`}
                    value={replies[q.id] ?? ""}
                    onChange={(e) => set(q.id, e.target.value)}
                    rows={2}
                    placeholder={q.placeholder || "Your answer"}
                    className="thin-scroll mt-2 w-full resize-y rounded-xl bg-fjord/[0.035] px-4 py-3 text-[14px] leading-relaxed ring-1 ring-fjord/[0.07] transition-shadow duration-300 placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-coral/60"
                  />
                </div>
              </div>
            </div>
          </Bezel>
        ))}
      </div>

      <Bezel className="mt-4">
        <div className="space-y-6 p-6 sm:p-7">
          <div>
            <span className="text-[15px] font-medium">
              Does this project store data in a database?
            </span>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              No database means no{" "}
              <code className="font-mono text-[12px]">schema.md</code>. Asked outright
              rather than guessed, because a schema for a project that has no tables is
              actively harmful.
            </p>
            <div className="mt-3 flex gap-2">
              {[
                { label: "Yes, it has a database", value: true },
                { label: "No database", value: false },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => setHasDatabase(option.value)}
                  className={cx(
                    "rounded-full px-4 py-2 text-[13px] transition-colors duration-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                    hasDatabase === option.value
                      ? "bg-fjord text-ivory"
                      : "bg-fjord/[0.05] text-ink-muted ring-1 ring-fjord/10 hover:bg-fjord/[0.09]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="stack" className="text-[15px] font-medium">
              Which stack should rules.md target?
            </label>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              This file is a hand-written template, not model output. The principles are
              the same on every project; only this section changes.
            </p>
            <select
              id="stack"
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              className="mt-3 rounded-xl bg-fjord/[0.05] px-4 py-2.5 text-[14px] ring-1 ring-fjord/10 focus:outline-none focus:ring-2 focus:ring-coral/60"
            >
              {Object.entries(RULES_STACKS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="brand" className="text-[15px] font-medium">
              Brand direction <span className="text-ink-muted">(optional)</span>
            </label>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              Hex values, fonts, or a reference you want held to. Given values are
              treated as fixed and the system is built around them.
            </p>
            <textarea
              id="brand"
              value={brandNotes}
              onChange={(e) => setBrandNotes(e.target.value)}
              rows={2}
              placeholder="#173B46 deep teal, #E46354 coral accent, warm ivory ground. Editorial serif headings."
              className="thin-scroll mt-3 w-full resize-y rounded-xl bg-fjord/[0.035] px-4 py-3 text-[14px] leading-relaxed ring-1 ring-fjord/[0.07] placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-coral/60"
            />
          </div>
        </div>
      </Bezel>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Button variant="quiet" onClick={onBack}>
          Back to the idea
        </Button>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-ink-muted">
            {answeredCount} of {questions.length} answered
          </span>
          <Button onClick={onSubmit} trailing={<ArrowGlyph />}>
            Write the documents
          </Button>
        </div>
      </div>
    </div>
  );
}
