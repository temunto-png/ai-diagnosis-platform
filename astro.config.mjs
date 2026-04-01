// astro.config.mjs
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://satsu-tei.com",
  output: "server",
  adapter: cloudflare(),
  integrations: [react(), mdx()],
  vite: {
    build: {
      emptyOutDir: false,
    },
  },
});
