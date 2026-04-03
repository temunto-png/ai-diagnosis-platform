import { describe, expect, it, vi } from "vitest";
import { getOrFetchDiagnosis, validateUploadFile, type UploadDependencies } from "./ImageUploader";

function createFile(type: string, size: number): File {
  return {
    type,
    size,
    arrayBuffer: vi.fn(),
  } as unknown as File;
}

function createDeps(overrides: Partial<UploadDependencies> = {}): UploadDependencies {
  return {
    fetchImpl: vi.fn(),
    storage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    hashBase64: vi.fn(async () => "a".repeat(64)),
    resizeImage: vi.fn(async () => "base64-image"),
    requestTimeoutMs: 50,
    ...overrides,
  };
}

describe("validateUploadFile", () => {
  it("accepts supported image types within the size limit", () => {
    expect(() => validateUploadFile(createFile("image/jpeg", 1024))).not.toThrow();
    expect(() => validateUploadFile(createFile("image/png", 1024))).not.toThrow();
    expect(() => validateUploadFile(createFile("image/webp", 1024))).not.toThrow();
  });

  it("rejects unsupported file types", () => {
    expect(() => validateUploadFile(createFile("image/gif", 1024))).toThrow(
      "JPEG / PNG / WebP 形式の画像を選択してください。"
    );
  });

  it("rejects files larger than 8MB", () => {
    expect(() => validateUploadFile(createFile("image/jpeg", 8 * 1024 * 1024 + 1))).toThrow(
      "画像サイズが大きすぎます。8MB 以下の画像を選択してください。"
    );
  });
});

describe("getOrFetchDiagnosis", () => {
  it("returns cached results when the cache entry is fresh", async () => {
    const deps = createDeps({
      storage: {
        getItem: vi.fn(() => JSON.stringify({ data: { damage_type: "scratch" }, ts: Date.now() })),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    });

    const result = await getOrFetchDiagnosis(createFile("image/jpeg", 1024), "app", "v2:test", {}, deps);

    expect(result).toEqual({ damage_type: "scratch" });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
  });

  it("removes broken cache entries and fetches fresh data", async () => {
    const deps = createDeps({
      fetchImpl: vi.fn(async () => Response.json({ damage_type: "fresh" })),
      storage: {
        getItem: vi.fn(() => "{broken"),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    });

    const result = await getOrFetchDiagnosis(createFile("image/jpeg", 1024), "app", "v2:test", {}, deps);

    expect(result).toEqual({ damage_type: "fresh" });
    expect(deps.storage.removeItem).toHaveBeenCalled();
    expect(deps.storage.setItem).toHaveBeenCalled();
  });

  it("preserves monetization data returned by the API", async () => {
    const deps = createDeps({
      fetchImpl: vi.fn(async () =>
        Response.json({
          damage_type: "fresh",
          monetization: {
            type: "affiliate",
            amazon_url: "https://example.com/amazon",
            rakuten_url: "https://example.com/rakuten",
            cpa_url: null,
          },
        })
      ),
    });

    const result = await getOrFetchDiagnosis(createFile("image/jpeg", 1024), "app", "v2:test", {}, deps);

    expect(result.monetization).toEqual({
      type: "affiliate",
      amazon_url: "https://example.com/amazon",
      rakuten_url: "https://example.com/rakuten",
      cpa_url: null,
    });
  });

  it("throws a user-facing message when the API returns a JSON error", async () => {
    const deps = createDeps({
      fetchImpl: vi.fn(async () => Response.json({ error: "too many requests" }, { status: 429 })),
    });

    await expect(getOrFetchDiagnosis(createFile("image/jpeg", 1024), "app", "v2:test", {}, deps)).rejects.toThrow(
      "診断回数の上限に達しました。時間をおいてから再度お試しください。"
    );
  });

  it("throws a timeout message when the diagnosis request takes too long", async () => {
    const deps = createDeps({
      requestTimeoutMs: 10,
      fetchImpl: vi.fn(
        async (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          })
      ),
    });

    await expect(getOrFetchDiagnosis(createFile("image/jpeg", 1024), "app", "v2:test", {}, deps)).rejects.toThrow(
      "診断がタイムアウトしました。通信環境を確認して、もう一度お試しください。"
    );
  });

  it("passes an abort signal to fetch for cancellation", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ damage_type: "fresh" }));
    const deps = createDeps({ fetchImpl });
    const controller = new AbortController();

    await getOrFetchDiagnosis(
      createFile("image/jpeg", 1024),
      "app",
      "v2:test",
      {},
      deps,
      controller.signal
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/app/analyze",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});
