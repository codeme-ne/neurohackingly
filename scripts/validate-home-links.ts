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
  // Simple href extractor and filter for "/blog/..." paths
  const hrefRegex = /<a\b[^>]*href\s*=\s*"([^"]+)"/gi;
  const links = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html))) {
    let href = m[1];
    // Ignore anchors, mailto, http(s) externals
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    // Normalize to pathname only if same-origin absolute URL
    try {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        const u = new URL(href);
        href = u.pathname;
      }
    } catch {}
    // We only care about blog links
    if (!href.startsWith('/blog/')) continue;
    // Strip query/hash
    href = href.replace(/[?#].*$/, '');
    links.add(href);
  }
  return Array.from(links);
}

async function checkViaFiles(distDir: string, urls: string[]): Promise<Result[]> {
  return urls.map((u) => {
    // Map "/blog/slug" to dist/blog/slug/index.html or dist/blog/slug.html
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
  const distDir = path.join(process.cwd(), 'dist');
  const homePath = path.join(distDir, 'index.html');
  if (!existsSync(homePath)) {
    console.error('dist/index.html not found. Build first: npm run build');
    process.exit(2);
  }
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
