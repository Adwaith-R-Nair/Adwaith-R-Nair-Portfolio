import type { MetadataRoute } from "next";
import { projects } from "@/content";
import { absolute } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: absolute("/"), lastModified, changeFrequency: "monthly", priority: 1 },
    ...projects.map((p) => ({
      url: absolute(`/work/${p.slug}`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: p.flagship ? 0.8 : 0.6,
    })),
  ];
}
