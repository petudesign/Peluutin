import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("routes PostHog through the first-party EU proxy before the SPA fallback", async () => {
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));

  assert.deepEqual(config.rewrites.slice(0, 3), [
    {
      source: "/rinki/static/:path(.*)",
      destination: "https://eu-assets.i.posthog.com/static/:path",
    },
    {
      source: "/rinki/array/:path(.*)",
      destination: "https://eu-assets.i.posthog.com/array/:path",
    },
    {
      source: "/rinki/:path(.*)",
      destination: "https://eu.i.posthog.com/:path",
    },
  ]);
  assert.deepEqual(config.rewrites.at(-1), { source: "/(.*)", destination: "/index.html" });

  const contentSecurityPolicy = config.headers[0].headers.find((header) => header.key === "Content-Security-Policy");
  assert.match(contentSecurityPolicy.value, /connect-src 'self'/);
});
