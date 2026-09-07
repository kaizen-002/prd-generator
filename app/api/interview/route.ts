import { NextResponse } from "next/server";
import { generateText, LLMError } from "@/lib/llm";
import { INTERVIEW_SYSTEM, interviewPrompt } from "@/lib/prompts/interview";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import type { InterviewQuestion } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req));
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter}s.` },
      { status: 429 },
    );
  }

  let idea = "";
  try {
    ({ idea } = await req.json());
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (typeof idea !== "string" || idea.trim().length < 12) {
    return NextResponse.json(
      { error: "Describe the idea in at least a full sentence." },
      { status: 400 },
    );
  }

  try {
    const raw = await generateText({
      system: INTERVIEW_SYSTEM,
      prompt: interviewPrompt(idea),
      temperature: 0.4,
      maxTokens: 2048,
      json: true,
    });

    const questions = parseQuestions(raw);
    if (!questions.length) {
      return NextResponse.json(
        { error: "The model did not return usable questions. Try rephrasing the idea." },
        { status: 502 },
      );
    }
    return NextResponse.json({ questions });
  } catch (err) {
    const message = err instanceof LLMError ? err.message : "Interview generation failed.";
    const status = err instanceof LLMError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Models wrap JSON in fences despite instructions; recover rather than fail. */
function parseQuestions(raw: string): InterviewQuestion[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return [];

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const list = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(list)) return [];

    return list
      .filter((q) => q && typeof q.question === "string")
      .map((q, i) => ({
        id: typeof q.id === "string" ? q.id : `q-${i}`,
        question: q.question,
        why: typeof q.why === "string" ? q.why : "",
        placeholder: typeof q.placeholder === "string" ? q.placeholder : "",
        options: Array.isArray(q.options)
          ? q.options.filter((o: unknown) => typeof o === "string").slice(0, 4)
          : undefined,
      }));
  } catch {
    return [];
  }
}
