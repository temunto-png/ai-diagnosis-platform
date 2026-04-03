import { DurableObject } from "cloudflare:workers";

const TTL_MS = 25 * 60 * 60 * 1000;

export class RateLimitDurableObject extends DurableObject {
  override async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body: { limit?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const limit = Number(body.limit);
    if (!Number.isInteger(limit) || limit <= 0) {
      return Response.json({ error: "Invalid limit" }, { status: 400 });
    }

    const count = (await this.ctx.storage.get<number>("count")) ?? 0;
    if (count >= limit) {
      return Response.json({ limited: true, count });
    }

    await this.ctx.storage.put("count", count + 1);

    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm === null) {
      await this.ctx.storage.setAlarm(Date.now() + TTL_MS);
    }

    return Response.json({ limited: false, count: count + 1 });
  }

  override async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
