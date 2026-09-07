import { LLMError, streamText } from "@/lib/llm";
import { DESIGN_SYSTEM, designPrompt } from "@/lib/prompts/design";
import { PRD_SYSTEM, prdPrompt } from "@/lib/prompts/prd";
import { SCHEMA_SYSTEM, schemaPrompt } from "@/lib/prompts/schema";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import type { Answer, Stage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  stage: Stage;
  idea?: string;
  answers?: Answer[];
  /** The user-edited PRD text. Stages after the first read this, not the original. */
  prd?: string;
  brandNotes?: string;
}

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req));
  if (!limit.ok) {
    return json({ error: `Too many requests. Try again in ${limit.retryAfter}s.` }, 429);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request body." }, 400);
  }

  let system: string;
  let prompt: string;

  switch (body.stage) {
    case "prd":
      if (!body.idea?.trim()) return json({ error: "Missing idea." }, 400);
      system = PRD_SYSTEM;
      prompt = prdPrompt(body.idea, body.answers ?? []);
      break;

    case "design":
      if (!body.prd?.trim()) return json({ error: "Missing PRD." }, 400);
      system = DESIGN_SYSTEM;
      prompt = designPrompt(body.prd, body.brandNotes);
      break;

    case "schema":
      if (!body.prd?.trim()) return json({ error: "Missing PRD." }, 400);
      system = SCHEMA_SYSTEM;
      prompt = schemaPrompt(body.prd);
      break;

    default:
      return json({ error: "Unknown stage." }, 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamText({ system, prompt, maxTokens: 16384 })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        // The response has already begun, so the failure is surfaced inline as
        // markdown rather than as a status code the client can no longer see.
        const message =
          err instanceof LLMError ? err.message : "Generation failed unexpectedly.";
        controller.enqueue(encoder.encode(`\n\n> **Generation stopped.** ${message}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
