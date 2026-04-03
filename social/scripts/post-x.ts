import { TwitterApi } from "twitter-api-v2";
import { existsSync } from "fs";

export async function postToX(text: string, imagePath?: string): Promise<string> {
  const client = new TwitterApi({
    appKey: process.env["X_API_KEY"]!,
    appSecret: process.env["X_API_SECRET"]!,
    accessToken: process.env["X_ACCESS_TOKEN"]!,
    accessSecret: process.env["X_ACCESS_SECRET"]!,
  });

  if (imagePath && existsSync(imagePath)) {
    const mediaId = await client.v1.uploadMedia(imagePath);
    const tweet = await client.v2.tweet({ text, media: { media_ids: [mediaId] } });
    return tweet.data.id;
  }

  const tweet = await client.v2.tweet(text);
  return tweet.data.id;
}
