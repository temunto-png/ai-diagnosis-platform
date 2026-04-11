import { TwitterApi } from "twitter-api-v2";
import { existsSync, statSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";

const X_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

async function compressImageIfNeeded(imagePath: string): Promise<{ path: string; tmpDir?: string }> {
  const size = statSync(imagePath).size;
  if (size <= X_IMAGE_MAX_BYTES) {
    return { path: imagePath };
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "x-upload-"));
  const outPath = join(tmpDir, "compressed.jpg");

  // Convert to JPEG, resize to max 2048px on the long edge, then reduce quality until under limit
  let quality = 85;
  while (quality >= 40) {
    await sharp(imagePath)
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toFile(outPath);

    if (statSync(outPath).size <= X_IMAGE_MAX_BYTES) {
      break;
    }
    quality -= 10;
  }

  return { path: outPath, tmpDir };
}

export async function postToX(text: string, imagePath?: string): Promise<string> {
  const client = new TwitterApi({
    appKey: process.env["X_API_KEY"]!,
    appSecret: process.env["X_API_SECRET"]!,
    accessToken: process.env["X_ACCESS_TOKEN"]!,
    accessSecret: process.env["X_ACCESS_SECRET"]!,
  });

  if (imagePath && existsSync(imagePath)) {
    const { path: uploadPath, tmpDir } = await compressImageIfNeeded(imagePath);
    try {
      const mediaId = await client.v1.uploadMedia(uploadPath);
      const tweet = await client.v2.tweet({ text, media: { media_ids: [mediaId] } });
      return tweet.data.id;
    } finally {
      if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  const tweet = await client.v2.tweet(text);
  return tweet.data.id;
}
