export const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const IMAGE_ANALYSIS_INSTRUCTION =
  "画像を診断し、説明文を含めずに JSON オブジェクトだけを返してください。";

const DEFAULT_MAX_TOKENS = 500;
const MIN_MAX_TOKENS = 200;
const MAX_MAX_TOKENS = 2048;
const DEFAULT_TIMEOUT_MS = 10000;

type ClaudeFetch = typeof fetch;

type ClaudeCallOptions = {
  fetchImpl?: ClaudeFetch;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status === 529 || status >= 500;
}

async function fetchWithTimeout(
  fetchImpl: ClaudeFetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function resolveMaxTokens(raw?: string): number {
  const parsed = parseInt(raw ?? "", 10);
  if (isNaN(parsed)) return DEFAULT_MAX_TOKENS;
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, parsed));
}

export async function callClaude(
  apiKey: string,
  imageBase64: string,
  prompt: string,
  maxRetries = 3,
  maxTokens = DEFAULT_MAX_TOKENS,
  options: ClaudeCallOptions = {}
): Promise<Record<string, unknown>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        fetchImpl,
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "prompt-caching-2024-07-31",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: maxTokens,
            system: [
              {
                type: "text",
                text: prompt,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
                  },
                  { type: "text", text: IMAGE_ANALYSIS_INSTRUCTION },
                ],
              },
            ],
          }),
        },
        timeoutMs
      );

      if (shouldRetryStatus(response.status) && attempt < maxRetries - 1) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }

      if (!response.ok) {
        let message = `Claude API error: ${response.status}`;
        try {
          const errorResponse = (await response.json()) as { error?: { message?: string } };
          message = errorResponse.error?.message ?? message;
        } catch {
          // Ignore non-JSON error responses.
        }
        throw new Error(message);
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text: string }>;
      };
      const text = data.content.find((block) => block.type === "text")?.text ?? "{}";
      const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        throw new Error(`Claude returned non-JSON response: ${cleaned.slice(0, 100)}`);
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      if ((isAbort || error instanceof TypeError) && attempt < maxRetries - 1) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      if (isAbort) {
        throw new Error(`Claude API timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  throw new Error("Claude API unavailable after retries");
}
