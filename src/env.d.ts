/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

type CloudflareEnv = {
  ANTHROPIC_API_KEY: string;
  AMAZON_ASSOCIATE_ID: string;
  RAKUTEN_AFFILIATE_ID: string;
  RATE_LIMIT_KV?: KVNamespace;
  DIAGNOSIS_CACHE_KV?: KVNamespace;
  CLAUDE_DIAGNOSIS_MAX_TOKENS?: string;
  DIAGNOSIS_CACHE_TTL_SECONDS?: string;
  MAX_IMAGE_BASE64_LENGTH?: string;
};

declare namespace App {
  interface Locals {
    runtime: {
      env: CloudflareEnv;
    };
  }
}
