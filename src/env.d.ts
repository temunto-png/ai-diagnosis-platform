/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

// Google Analytics 4 global declarations
declare function gtag(...args: unknown[]): void;
declare var dataLayer: unknown[];

declare module "cloudflare:workers" {
  const env: CloudflareEnv;
  export { env };
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
};

declare namespace App {
  interface Locals {
    runtime: {
      env: CloudflareEnv;
    };
  }
}
