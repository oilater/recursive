import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withVanillaExtract = createVanillaExtractPlugin();

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {};

export default withAnalyzer(withVanillaExtract(nextConfig));
