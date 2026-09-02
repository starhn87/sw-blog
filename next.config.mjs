import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

if (process.env.NODE_ENV === "development") {
  await initOpenNextCloudflareForDev({ configPath: "wrangler.worker.jsonc" });
}

export default process.env.ANALYZE === "true"
  ? withBundleAnalyzer(nextConfig)
  : nextConfig;
