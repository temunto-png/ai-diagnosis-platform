const MODEL = "claude-haiku-4-5-20251001";

export async function callClaude(
  apiKey: string,
  imageBase64: string,
  prompt: string,
  maxRetries = 3
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
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
              { type: "text", text: "上記の画像を診断してください。" },
            ],
          },
        ],
      }),
    });

    if (response.status === 529) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }

    if (!response.ok) {
      let message = `Claude API error: ${response.status}`;
      try {
        const err = await response.json() as { error?: { message?: string } };
        message = err.error?.message ?? message;
      } catch {
        // non-JSON error response（HTMLエラーページ等）は無視してデフォルトメッセージを使用
      }
      throw new Error(message);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content.find((b) => b.type === "text")?.text ?? "{}";
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`Claude returned non-JSON response: ${cleaned.slice(0, 100)}`);
    }
  }
  throw new Error("Claude API unavailable after retries");
}
