/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />

declare function gtag(...args: unknown[]): void;
declare var dataLayer: unknown[];

declare namespace App {
  interface Locals {
    runtime: {
      env: CloudflareEnv;
    };
  }
}
