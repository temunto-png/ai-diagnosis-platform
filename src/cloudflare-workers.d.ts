interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number): Promise<void>;
  deleteAll(): Promise<void>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
}

interface DurableObjectNamespace {
  getByName(name: string): {
    fetch(request: Request): Promise<Response>;
  };
}

type CloudflareEnv = {
  ANTHROPIC_API_KEY: string;
  AMAZON_ASSOCIATE_ID: string;
  RAKUTEN_AFFILIATE_ID: string;
  RATE_LIMITER: DurableObjectNamespace;
  DIAGNOSIS_CACHE_KV?: KVNamespace;
  CLAUDE_DIAGNOSIS_MAX_TOKENS?: string;
  DIAGNOSIS_CACHE_TTL_SECONDS?: string;
  MAX_IMAGE_BASE64_LENGTH?: string;
  EXPECTED_ORIGIN?: string;
  PUBLIC_GA_ID?: string;
  PUBLIC_ADSENSE_CLIENT_ID?: string;
};

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;

  export class DurableObject {
    protected readonly ctx: DurableObjectState;
    protected readonly env: CloudflareEnv;

    constructor(ctx: DurableObjectState, env: CloudflareEnv);
  }
}
