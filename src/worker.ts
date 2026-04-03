import server from "@astrojs/cloudflare/entrypoints/server";
import { RateLimitDurableObject } from "./lib/rate-limit-do";

export { RateLimitDurableObject };

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    return server.fetch(request, env, context);
  },
};
