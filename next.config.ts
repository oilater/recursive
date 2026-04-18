import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";
import withBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withVanillaExtract = createVanillaExtractPlugin();

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      source: "/embed",
      headers: [
        { key: "X-Frame-Options", value: "ALLOWALL" },
      ],
    },
    {
      source: "/:locale/embed",
      headers: [
        { key: "X-Frame-Options", value: "ALLOWALL" },
      ],
    },
  ],
};

export default withAnalyzer(withVanillaExtract(withNextIntl(nextConfig)));
