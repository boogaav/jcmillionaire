// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://jackiechain.world";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/live", changefreq: "daily", priority: "0.9" },
  { path: "/live/legacy", changefreq: "monthly", priority: "0.5" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.7" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let dynamicEntries: SitemapEntry[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { data: sets, error } = await supabase
        .from("live_quiz_sets")
        .select("slug, updated_at")
        .not("slug", "is", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch live quiz sets for sitemap:", error.message);
      } else if (sets) {
        dynamicEntries = sets
          .filter((s): s is { slug: string; updated_at: string | null } => typeof s.slug === "string" && s.slug.length > 0)
          .map((s) => ({
            path: `/live/${encodeURIComponent(s.slug)}`,
            lastmod: s.updated_at ? s.updated_at.split("T")[0] : undefined,
            changefreq: "weekly",
            priority: "0.8",
          }));
      }
    } catch (err) {
      console.warn("Supabase fetch failed during sitemap generation:", err);
    }
  } else {
    console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY; skipping dynamic live show entries.");
  }

  const entries = [...staticEntries, ...dynamicEntries];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries, ${dynamicEntries.length} dynamic)`);
}

main().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exit(1);
});
