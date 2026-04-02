const GRAPH_BASE = "https://graph.facebook.com/v19.0";

async function getOgImage(articleUrl: string): Promise<string | null> {
  const res = await fetch(articleUrl);
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
  return match ? match[1] : null;
}

export async function postToInstagram(
  caption: string,
  articleUrl: string
): Promise<string> {
  const userId = process.env["INSTAGRAM_USER_ID"]!;
  const token = process.env["INSTAGRAM_ACCESS_TOKEN"]!;

  const imageUrl = await getOgImage(articleUrl);
  if (!imageUrl) {
    throw new Error(`No OG image found for ${articleUrl}`);
  }

  // Step 1: メディアコンテナ作成
  const createRes = await fetch(`${GRAPH_BASE}/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  if (!createRes.ok) {
    throw new Error(`Instagram media create failed: ${await createRes.text()}`);
  }
  const { id: creationId } = (await createRes.json()) as { id: string };

  // Step 2: 公開
  const publishRes = await fetch(`${GRAPH_BASE}/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  if (!publishRes.ok) {
    throw new Error(`Instagram publish failed: ${await publishRes.text()}`);
  }
  const { id: postId } = (await publishRes.json()) as { id: string };
  return postId;
}
