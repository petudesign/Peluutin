import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const HOVER_MEDIA = "(hover: hover) and (pointer: fine)";

// Touch browsers keep :hover applied after a tap, so all hover rules only apply on devices that can really hover.
const gateHoverRules = {
  postcssPlugin: "gate-hover-rules",
  Once(root, { AtRule }) {
    root.walkRules((rule) => {
      if (!rule.selector.includes(":hover") || rule.parent.params === HOVER_MEDIA) return;
      const hoverSelectors = rule.selectors.filter((selector) => selector.includes(":hover"));
      const otherSelectors = rule.selectors.filter((selector) => !selector.includes(":hover"));
      const gated = new AtRule({ name: "media", params: HOVER_MEDIA });
      gated.append(rule.clone({ selectors: hoverSelectors }));
      rule.after(gated);
      if (otherSelectors.length) rule.selectors = otherSelectors;
      else rule.remove();
    });
  },
};

export default defineConfig({
  css: {
    postcss: { plugins: [gateHoverRules] },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local"),
  },
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.tsx"],
    },
  },
  plugins: [react()],
});
