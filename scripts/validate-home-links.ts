#!/usr/bin/env node
// Validate blog links on the built homepage (dist/index.html) or via a base URL.
// Usage:
//   - From files:  npx tsx scripts/validate-home-links.ts
//   - Via URL:     npx tsx scripts/validate-home-links.ts --base http://localhost:4321

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

type Result = { url: string; ok: boolean; status?: number; note?: string };

function parseArgs(argv: string[]): { base?: string } {
  const out: { base?: string } = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base' && argv[i + 1]) {
      out.base = argv[i + 1];
      i++;
    } else if (a.startsWith('--base=')) {
      out.base = a.slice('--base='.length);
    }
  }
  return out;
}

function extractBlogLinksFromHTML(html: string): string[] {
  // Extract post links (now at root level, excluding static pages)
  const hrefRegex = /<a\b[^>]*href\s*=\s*"([^"]+)"/gi;
  const links = new Set<string>();
  const STATIC_PAGES = ['/', '/now', '/newsletter', '/blog', '/rss.xml', '/sitemap.xml', '/robots.txt'];

  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html))) {
    let href = m[1];
    // Ignore anchors, mailto, http(s) externals
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    // Normalize to pathname only if same-origin absolute URL
    try {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        const u = new URL(href);
        // Skip external domains entirely – we only care about same-site links.
        if (u.hostname && u.hostname !== 'neurohackingly.com' && u.hostname !== 'www.neurohackingly.com') {
          continue;
        }
        href = u.pathname;
      }
    } catch {}
    // Strip query/hash
    href = href.replace(/[?#].*$/, '');

    // Skip static pages and /tag/ paths
    if (STATIC_PAGES.includes(href) || href.startsWith('/tag/')) continue;

    // Only care about root-level post links (/:slug pattern)
    if (href.startsWith('/') && !href.startsWith('/blog/') && href.split('/').length === 2) {
      links.add(href);
    }
  }
  return Array.from(links);
}

async function checkViaFiles(distDir: string, urls: string[]): Promise<Result[]> {
  return urls.map((u) => {
    // Map "/:slug" to dist/:slug/index.html or dist/:slug.html
    const rel = u.replace(/^\//, '');
    const indexHtml = path.join(distDir, rel, 'index.html');
    const fileHtml = path.join(distDir, `${rel}.html`);
    if (existsSync(indexHtml) || existsSync(fileHtml)) {
      return { url: u, ok: true, status: 200 };
    }
    return { url: u, ok: false, note: 'file not found' };
  });
}

async function checkViaHTTP(base: string, urls: string[]): Promise<Result[]> {
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  const out: Result[] = [];
  for (const u of urls) {
    const full = `${normalized}${u}`;
    try {
      let res = await fetch(full, { method: 'HEAD' });
      // Fallback to GET for servers not supporting HEAD
      if (res.status === 405 || res.status === 501) {
        res = await fetch(full, { method: 'GET' });
      }
      out.push({ url: u, ok: res.ok, status: res.status });
    } catch (err) {
      out.push({ url: u, ok: false, note: (err as Error).message });
    }
  }
  return out;
}

async function main() {
  const { base } = parseArgs(process.argv);
  if (base) {
    // Fetch homepage HTML from base URL
    const homeURL = base.endsWith('/') ? base : `${base}/`;
    const res = await fetch(homeURL);
    const html = await res.text();
    const links = extractBlogLinksFromHTML(html);
    const results = await checkViaHTTP(base, links);
    const ok = results.filter((r) => r.ok);
    const bad = results.filter((r) => !r.ok);
    for (const r of results) {
      if (r.ok) console.log(`[200] ${r.url}`);
      else console.log(`[ERROR] ${r.url}${r.status ? ` (${r.status})` : r.note ? ` (${r.note})` : ''}`);
    }
    console.log(`\nSummary: OK=${ok.length} ERROR=${bad.length}`);
    process.exit(bad.length === 0 ? 0 : 1);
  }

  // File-based check from dist
  const distRoot = path.join(process.cwd(), 'dist');
  const candidates = [
    { home: path.join(distRoot, 'index.html'), base: distRoot },
    { home: path.join(distRoot, 'client', 'index.html'), base: path.join(distRoot, 'client') },
    { home: path.join(distRoot, 'client', 'home', 'index.html'), base: path.join(distRoot, 'client') }
  ];

  const found = candidates.find((c) => existsSync(c.home));
  if (!found) {
    console.error('No built homepage found in dist/. Build first: npm run build');
    process.exit(2);
  }

  const { home: homePath, base: distDir } = found;
  const html = await readFile(homePath, 'utf8');
  const links = extractBlogLinksFromHTML(html);
  const results = await checkViaFiles(distDir, links);
  const ok = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);
  for (const r of results) {
    if (r.ok) console.log(`[200] ${r.url}`);
    else console.log(`[ERROR] ${r.url}${r.note ? ` (${r.note})` : ''}`);
  }
  console.log(`\nSummary: OK=${ok.length} ERROR=${bad.length}`);
  process.exit(bad.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
