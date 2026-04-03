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
    hashFile: vi.fn(async () => "a".repeat(64)),
    resizeImage: vi.fn(async () => "base64-image"),
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

    const result = await getOrFetchDiagnosis(createFile("image/jpeg", 1024), "app", {}, deps);

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

    const result = await getOrFetchDiagnosis(createFile("image/jpeg", 1024), "app", {}, deps);

    expect(result).toEqual({ damage_type: "fresh" });
    expect(deps.storage.removeItem).toHaveBeenCalled();
    expect(deps.storage.setItem).toHaveBeenCalled();
  });

  it("throws a user-facing message when the API returns a JSON error", async () => {
    const deps = createDeps({
      fetchImpl: vi.fn(async () => Response.json({ error: "too many requests" }, { status: 429 })),
    });

    await expect(getOrFetchDiagnosis(createFile("image/jpeg", 1024), "app", {}, deps)).rejects.toThrow(
      "too many requests"
    );
  });
});
