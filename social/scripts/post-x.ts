import { TwitterApi } from "twitter-api-v2";

export async function postToX(text: string): Promise<string> {
  const client = new TwitterApi({
    appKey: process.env["X_API_KEY"]!,
    appSecret: process.env["X_API_SECRET"]!,
    accessToken: process.env["X_ACCESS_TOKEN"]!,
    accessSecret: process.env["X_ACCESS_SECRET"]!,
  });
  const tweet = await client.v2.tweet(text);
  return tweet.data.id;
}
