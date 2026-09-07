"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import { copyText, downloadMarkdown } from "@/lib/download";
import { Bezel, Button, Rule } from "./ui";
import type { DocMeta } from "@/lib/types";

interface Props {
  meta: DocMeta;
  value: string;
  streaming: boolean;
  onChange: (next: string) => void;
  /** Rendered under the header — the action that advances to the next stage. */
  footer?: React.ReactNode;
  note?: string;
}

export function DocPanel({ meta, value, streaming, onChange, footer, note }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (await copyText(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  const lines = value ? value.split("\n").length : 0;

  return (
    <Bezel className="rise">
      <div className="flex flex-col">
        <header className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-2xl tracking-tight">{meta.title}</h3>
              <code className="rounded-full bg-fjord/[0.06] px-2.5 py-1 font-mono text-[11px] text-ink-muted">
                {meta.filename}
              </code>
              {streaming ? (
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />
                  writing
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{meta.blurb}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="quiet" onClick={handleCopy} disabled={!value || streaming}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              onClick={() => downloadMarkdown(meta.filename, value)}
              disabled={!value || streaming}
            >
              Download
            </Button>
          </div>
        </header>

        <div className="px-6 pt-5 sm:px-8">
          <Rule />
        </div>

        <label className="sr-only" htmlFor={`doc-${meta.id}`}>
          {meta.filename} contents, editable
        </label>
        <textarea
          id={`doc-${meta.id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="Not generated yet."
          className={cx(
            "thin-scroll mt-1 min-h-[26rem] w-full resize-y bg-transparent px-6 py-5 sm:px-8",
            "font-mono text-[12.5px] leading-[1.75] text-ink",
            "placeholder:text-ink-muted/50 focus:outline-none",
          )}
        />

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-fjord/[0.08] px-6 py-4 sm:px-8">
          <p className="font-mono text-[11px] text-ink-muted">
            {value ? `${lines} lines · ${value.length.toLocaleString()} chars` : "empty"}
            {note ? ` · ${note}` : ""}
          </p>
          {footer}
        </footer>
      </div>
    </Bezel>
  );
}
