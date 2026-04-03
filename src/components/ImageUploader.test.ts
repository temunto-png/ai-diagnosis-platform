import { describe, expect, it } from "vitest";
import { validateUploadFile } from "./ImageUploader";

function createFile(type: string, size: number): File {
  return {
    type,
    size,
  } as File;
}

describe("validateUploadFile", () => {
  it("accepts supported image types within the size limit", () => {
    expect(() => validateUploadFile(createFile("image/jpeg", 1024))).not.toThrow();
    expect(() => validateUploadFile(createFile("image/png", 1024))).not.toThrow();
    expect(() => validateUploadFile(createFile("image/webp", 1024))).not.toThrow();
  });

  it("rejects unsupported file types", () => {
    expect(() => validateUploadFile(createFile("image/gif", 1024))).toThrow(
      "JPEG/PNG/WebP形式の画像を選択してください"
    );
  });

  it("rejects files larger than 8MB", () => {
    expect(() => validateUploadFile(createFile("image/jpeg", 8 * 1024 * 1024 + 1))).toThrow(
      "画像サイズが大きすぎます。8MB以下の画像を選択してください"
    );
  });
});
