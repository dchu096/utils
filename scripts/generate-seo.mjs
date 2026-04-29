/* eslint-env node */

import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://dchu096.tk";
const REPO_ROOT = process.cwd();
const OUTPUT_DIRS = [REPO_ROOT, path.join(REPO_ROOT, "dist")];
const SKIP_DIRS = new Set([".git", ".idea", "dist", "node_modules"]);

async function collectHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          return [];
        }

        return collectHtmlFiles(fullPath);
      }

      return entry.isFile() && entry.name === "index.html" ? [fullPath] : [];
    }),
  );

  return files.flat();
}

function normalizeCanonical(url) {
  if (!url.startsWith(SITE_URL)) {
    return null;
  }

  const normalized = url.endsWith("/") ? url : `${url}/`;
  return normalized === `${SITE_URL}//` ? `${SITE_URL}/` : normalized;
}

async function extractUrlEntry(filePath) {
  const [html, fileStats] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i);

  if (!canonicalMatch) {
    return null;
  }

  const canonical = normalizeCanonical(canonicalMatch[1]);

  if (!canonical) {
    return null;
  }

  return {
    canonical,
    lastmod: fileStats.mtime.toISOString(),
  };
}

function buildSitemap(entries) {
  const urls = entries
    .sort((left, right) => left.canonical.localeCompare(right.canonical))
    .map(
      ({ canonical, lastmod }) => `  <url>
    <loc>${canonical}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

async function writeOutputs(fileName, content) {
  await Promise.all(
    OUTPUT_DIRS.map(async (outputDir) => {
      await mkdir(outputDir, { recursive: true });
      await writeFile(path.join(outputDir, fileName), content, "utf8");
    }),
  );
}

async function main() {
  const htmlFiles = await collectHtmlFiles(REPO_ROOT);
  const entries = await Promise.all(htmlFiles.map(extractUrlEntry));
  const uniqueEntries = Array.from(
    new Map(entries.filter(Boolean).map((entry) => [entry.canonical, entry])).values(),
  );

  await writeOutputs("sitemap.xml", buildSitemap(uniqueEntries));
  await writeOutputs("robots.txt", buildRobots());

  console.log(`Generated SEO files for ${uniqueEntries.length} canonical routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
