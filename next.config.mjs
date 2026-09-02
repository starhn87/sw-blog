import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import bundleAnalyzer from "@next/bundle-analyzer";
import { fileURLToPath } from "node:url";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // rehype-pretty-code's default import otherwise bundles every Shiki language/theme.
  transpilePackages: ["shiki"],
  turbopack: {
    resolveAlias: { shiki: "./src/lib/shiki.ts" },
  },
  webpack(config) {
    config.resolve.alias["shiki$"] = fileURLToPath(new URL("./src/lib/shiki.ts", import.meta.url));
    return config;
  },
};

if (process.env.NODE_ENV === "development") {
  await initOpenNextCloudflareForDev({ configPath: "wrangler.worker.jsonc" });
}

export default process.env.ANALYZE === "true"
  ? withBundleAnalyzer(nextConfig)
  : nextConfig;
