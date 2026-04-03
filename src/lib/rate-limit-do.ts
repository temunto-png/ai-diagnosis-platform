import { DurableObject } from "cloudflare:workers";

const MAX_RESET_AFTER_MS = 26 * 60 * 60 * 1000;

export class RateLimitDurableObject extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body: { limit?: unknown; resetAfterMs?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const limit = Number(body.limit);
    const resetAfterMs = Number(body.resetAfterMs);
    if (!Number.isInteger(limit) || limit <= 0) {
      return Response.json({ error: "Invalid limit" }, { status: 400 });
    }
    if (!Number.isInteger(resetAfterMs) || resetAfterMs <= 0 || resetAfterMs > MAX_RESET_AFTER_MS) {
      return Response.json({ error: "Invalid resetAfterMs" }, { status: 400 });
    }

    const count = (await this.ctx.storage.get<number>("count")) ?? 0;
    if (count >= limit) {
      return Response.json({ limited: true, count });
    }

    await this.ctx.storage.put("count", count + 1);

    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm === null) {
      await this.ctx.storage.setAlarm(Date.now() + resetAfterMs);
    }

    return Response.json({ limited: false, count: count + 1 });
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
