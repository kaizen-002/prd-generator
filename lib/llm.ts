/**
 * Provider adapter for the free tiers of Gemini and Groq.
 *
 * Both are reached with plain `fetch` against their REST endpoints — no SDK, so
 * swapping providers is an env var, not a refactor. Keys are read from
 * `process.env` and this module must only ever be imported from server code.
 */

export type Provider = "gemini" | "groq";

export interface GenerateOptions {
  system: string;
  prompt: string;
  /** Upper bound on output tokens. Free tiers cap lower than this in practice. */
  maxTokens?: number;
  temperature?: number;
  /** Ask the provider to constrain output to a JSON object. */
  json?: boolean;
  /**
   * Called with whichever provider actually served the request. With failover in
   * play, "the model returned something unusable" is not diagnosable unless the
   * caller knows which model that was.
   */
  onProvider?: (provider: Provider) => void;
}

export class LLMError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = "LLMError";
  }
}

/** Thrown up to the client when the model stopped because it ran out of room. */
export const TRUNCATION_NOTICE =
  "\n\n> **Output truncated.** The model hit its length limit. Shorten the input, or split this document.";

interface Configured {
  provider: Provider;
  key: string;
  model: string;
}

function configure(provider: Provider): Configured | null {
  if (provider === "groq") {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;
    return {
      provider,
      key,
      model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    };
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return {
    provider: "gemini",
    key,
    model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
  };
}

/**
 * The providers to try, in order. The primary comes from LLM_PROVIDER; the other
 * follows it whenever its key is present, so a rate-limited free tier falls
 * through instead of failing the request.
 *
 * Set LLM_FALLBACK=off to keep a single provider — useful when you want a quota
 * error to be loud rather than silently spending the other budget.
 */
function providerChain(): Configured[] {
  const primary = (process.env.LLM_PROVIDER ?? "gemini") as Provider;
  const secondary: Provider = primary === "gemini" ? "groq" : "gemini";

  const chain = [configure(primary)];
  if (process.env.LLM_FALLBACK !== "off") chain.push(configure(secondary));

  const usable = chain.filter((c): c is Configured => c !== null);
  if (!usable.length) {
    throw new LLMError(
      "No API key configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env.local.",
      500,
    );
  }
  return usable;
}

/**
 * Gemini 3.x models think before answering, and those thoughts are billed against
 * the same output budget the document needs — an unconstrained 3.6-flash spent
 * 246 thinking tokens on a four-token reply. Capping the level keeps the budget
 * for the document itself.
 *
 * Only 3.x accepts `thinkingLevel`; 2.5 uses a different field and rejects this
 * one, so the config is omitted for anything that is not a 3.x model.
 */
function thinkingConfig(model: string): Record<string, unknown> {
  if (!/^gemini-3/.test(model)) return {};
  const level = process.env.GEMINI_THINKING_LEVEL ?? "low";
  return { thinkingConfig: { thinkingLevel: level } };
}

/** A failure worth trying the next provider for: quota, or the provider being down. */
function isFailoverWorthy(status: number): boolean {
  return status === 429 || status === 503 || status === 500 || status === 502;
}

/** Non-streaming call. Used for the interview stage, which returns JSON. */
export async function generateText(options: GenerateOptions): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of streamText(options)) chunks.push(chunk);
  return chunks.join("");
}

/**
 * Streams the model's text as an async iterable of plain string deltas.
 * The two providers disagree on wire format, so each gets its own reader and
 * both normalise down to the same `string` deltas.
 */
export async function* streamText(
  options: GenerateOptions,
): AsyncGenerator<string> {
  const {
    system,
    prompt,
    maxTokens = 8192,
    temperature = 0.7,
    json = false,
    onProvider,
  } = options;
  const chain = providerChain();

  let lastError: LLMError | null = null;

  for (let i = 0; i < chain.length; i++) {
    const { provider, key, model } = chain[i];
    const wire = { key, model, system, prompt, maxTokens, temperature, json };
    const source = provider === "groq" ? streamGroq(wire) : streamGemini(wire);
    onProvider?.(provider);

    /*
     * Failover is only safe until the first token reaches the caller. After
     * that the client already holds part of a document, and restarting on
     * another model would splice two different documents together — so a
     * mid-stream failure is reported rather than retried.
     */
    let emitted = false;
    try {
      for await (const chunk of source) {
        emitted = true;
        yield chunk;
      }
      return;
    } catch (err) {
      const error =
        err instanceof LLMError ? err : new LLMError("Generation failed.", 500);

      if (emitted) throw error;

      lastError = error;
      const hasNext = i < chain.length - 1;
      if (!hasNext || !isFailoverWorthy(error.status)) throw error;
      // Otherwise fall through to the next provider in the chain.
    }
  }

  throw lastError ?? new LLMError("Generation failed.", 500);
}

interface Wire {
  key: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  json: boolean;
}

async function* streamGemini(w: Wire): AsyncGenerator<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${w.model}:streamGenerateContent` +
    `?alt=sse&key=${encodeURIComponent(w.key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: w.system }] },
      contents: [{ role: "user", parts: [{ text: w.prompt }] }],
      generationConfig: {
        temperature: w.temperature,
        maxOutputTokens: w.maxTokens,
        ...thinkingConfig(w.model),
        ...(w.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw new LLMError(await describeFailure(res, "Gemini"), res.status);
  }

  for await (const data of readSSE(res.body)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    const candidate = (parsed as GeminiChunk).candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("");
    if (text) yield text;
    if (candidate?.finishReason === "MAX_TOKENS") yield TRUNCATION_NOTICE;
  }
}

async function* streamGroq(w: Wire): AsyncGenerator<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${w.key}`,
    },
    body: JSON.stringify({
      model: w.model,
      stream: true,
      temperature: w.temperature,
      max_tokens: w.maxTokens,
      ...(w.json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: w.system },
        { role: "user", content: w.prompt },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    throw new LLMError(await describeFailure(res, "Groq"), res.status);
  }

  for await (const data of readSSE(res.body)) {
    if (data === "[DONE]") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    const choice = (parsed as GroqChunk).choices?.[0];
    const text = choice?.delta?.content;
    if (text) yield text;
    if (choice?.finish_reason === "length") yield TRUNCATION_NOTICE;
  }
}

/**
 * Shared SSE line reader. Yields the payload after each `data: ` prefix.
 *
 * The trailing flush matters: a stream can end without a final newline, and
 * dropping that last line silently truncates the response. In prose that looks
 * like a slightly short document; in JSON it fails to parse, and only sometimes,
 * because whether the last line is newline-terminated depends on chunking.
 */
async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function* takeLines(flush: boolean) {
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
    if (flush) {
      const rest = buffer.trim();
      buffer = "";
      if (rest.startsWith("data:")) yield rest.slice(5).trim();
    }
  }

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    yield* takeLines(false);
  }

  buffer += decoder.decode();
  yield* takeLines(true);
}

async function describeFailure(res: Response, label: string): Promise<string> {
  const body = await res.text().catch(() => "");
  if (res.status === 429) {
    return `${label} rate limit reached. Free tiers refill after a minute — wait and retry.`;
  }
  if (res.status === 401 || res.status === 403) {
    return `${label} rejected the API key. Check the value in .env.local.`;
  }
  return `${label} request failed (${res.status}). ${body.slice(0, 300)}`;
}

interface GeminiChunk {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
}

interface GroqChunk {
  choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
}
