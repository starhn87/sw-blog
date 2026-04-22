import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

if (process.env.NODE_ENV === "development") {
  await setupDevPlatform();
}

export default withBundleAnalyzer(nextConfig);
