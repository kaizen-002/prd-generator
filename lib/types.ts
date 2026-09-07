export type Stage = "prd" | "design" | "schema";

export type DocId = Stage | "rules";

export interface InterviewQuestion {
  id: string;
  question: string;
  /** Why this matters — shown under the field so the user answers usefully. */
  why: string;
  placeholder: string;
  /** Suggested answers the user can click to fill the field. */
  options?: string[];
}

export interface Answer {
  question: string;
  answer: string;
}

export interface DocMeta {
  id: DocId;
  filename: string;
  title: string;
  blurb: string;
}

export const DOCS: Record<DocId, DocMeta> = {
  prd: {
    id: "prd",
    filename: "PRD.md",
    title: "Product Requirements",
    blurb:
      "Scope, MVP cut, technical requirements, success metrics — and an explicit Out of Scope list that keeps an agent from wandering.",
  },
  design: {
    id: "design",
    filename: "design.md",
    title: "Design System",
    blurb:
      "Tokens, not adjectives. Colour with measured contrast, type scale, spacing, motion, accessibility rules.",
  },
  schema: {
    id: "schema",
    filename: "schema.md",
    title: "Database Schema",
    blurb:
      "Tables, relations, an ERD, row-level security policies and migration notes. Skipped when the project has no database.",
  },
  rules: {
    id: "rules",
    filename: "rules.md",
    title: "Coding Rules",
    blurb:
      "SOLID, KISS, and DRY stated precisely enough to be followed. Written once by hand, not rolled fresh each time.",
  },
};

export const DOC_ORDER: DocId[] = ["prd", "design", "schema", "rules"];
