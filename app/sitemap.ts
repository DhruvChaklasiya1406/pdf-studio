import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pdf-studio.vercel.app";
  const routes = [
    "",
    "/merge-pdf",
    "/jpg-to-pdf",
    "/pdf-to-jpg",
    "/split-pdf",
    "/rotate-pdf",
    "/privacy-policy",
    "/terms",
    "/contact",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: "2026-11-12",
    changeFrequency: route === "" || route.includes("pdf") ? "weekly" : "monthly",
    priority: route === "" ? 1.0 : route.includes("pdf") ? 0.9 : 0.5,
  }));
}
