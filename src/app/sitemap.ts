import type { MetadataRoute } from "next";

const BASE_URL = "https://recursive-ochre.vercel.app";

const pages = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/algorithms", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/visualize/playground", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/visualize/permutations", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/visualize/combinations", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/visualize/subsets", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/visualize/bubble-sort", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/visualize/selection-sort", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/visualize/insertion-sort", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/visualize/quick-sort", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/visualize/merge-sort", changeFrequency: "monthly" as const, priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap(({ path, changeFrequency, priority }) => [
    {
      url: `${BASE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
      alternates: {
        languages: {
          ko: `${BASE_URL}${path}`,
          en: `${BASE_URL}/en${path}`,
        },
      },
    },
  ]);
}
