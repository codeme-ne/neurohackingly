# CLAUDE.md

Guidance for Claude Code when working in this repository. This is an Astro 5 static blog for neurohackingly.com, migrated from Ghost CMS. The info below reflects the current repo state (scanned on 2025‑10‑25).

## Quick start

```bash
# Dev server
npm run dev           # http://localhost:4321

# Build & preview (static output in ./dist)
npm run build
npm run preview       # serves ./dist locally

# Content utilities
npm run parse-ghost   # Parse Ghost export → MDX (scripts/ghost-parser.ts)
npm run migrate-images  # Move/rewire images into public/images (scripts/migrate-images.ts)
```

Dependencies of note: astro 5.x, @astrojs/mdx, @astrojs/sitemap, @astrojs/rss, @astrojs/vercel, tsx.

## Project layout

```text
src/
  content/
    blog/            # English MDX posts (filename = slug)
    de/              # German MDX posts (currently empty)
    config.ts        # Zod schemas for blog/de collections
  pages/
    index.astro
    newsletter.astro
    blog/
      index.astro
      [slug].astro   # Renders one post from blog collection
  layouts/
    BlogPost.astro   # Post wrapper: SEO, hero/image, meta, reading time
  components/
    SEO.astro        # Open Graph/Twitter/Article tags
    Video.astro, GifVideo.astro
  styles/
    global.css       # Site styles
public/
  images/...         # Post images (by slug) used by migration scripts
  robots.txt, favicon.svg
```

## Content model (src/content/config.ts)

Both collections share the same schema:
- Required: title (string), description (string), pubDate (date)
- Optional: updatedDate (date), author (default "Lukas Zangerl"),
  image { url, alt }, hero (Astro assets image), tags[] (default []),
  featured (bool), draft (bool)

Important behaviors:
- Slugs are derived from the MDX filename via post.id.
- Draft posts are excluded by getCollection filters in pages.
- hero uses Astro Assets. If you set hero in frontmatter, BlogPost.astro renders an optimized <Image/>; otherwise it falls back to image.url (legacy).

### Authoring a new post
1. Add `src/content/blog/my-post.mdx` (or to `de/` for German).
1. Frontmatter example:

```md
---
title: "My Post"
description: "What this post covers"
pubDate: 2025-10-25
tags: [productivity, study]
featured: false
draft: false
# Optional legacy image
image: { url: "/images/my-post/cover.jpg", alt: "Cover" }
# Optional Astro Assets hero (recommended)
# hero: "../../assets/heroes/my-post.jpg"
---

Content here…
```

1. Visit /blog/my-post.

## Routing

- List: `src/pages/blog/index.astro` enumerates non-draft posts and renders cards.
- Detail: `src/pages/blog/[slug].astro` uses `getStaticPaths()` with `post.id`.
- Home: `src/pages/index.astro` shows recent posts and any featured content.
- Newsletter landing: `src/pages/newsletter.astro` (placeholder form).

Note on German content: `src/content/de/` exists, but there are no routes for it yet. If you add German MDX files, create `src/pages/de/index.astro` and `src/pages/de/[slug].astro` or adapt the existing blog routes to be locale‑aware.

## SEO and metadata

- `src/components/SEO.astro` centralizes meta, Open Graph, Twitter, canonical, and RSS link.
- Default social image is `/og-image.jpg`. This file does not exist in `public/` right now. Add `public/og-image.jpg` (1200×630 recommended) or change the default in `SEO.astro` to an existing asset.
- `BlogPost.astro` injects Schema.org `BlogPosting` JSON‑LD and computes a simple reading time (~200 wpm).

## RSS

- `src/pages/rss.xml.js` builds a feed from the blog collection (English only).
- If you publish German posts, decide whether to include them in the same feed or ship a separate `/de/rss.xml`.

## Scripts

- `npm run parse-ghost` → `scripts/ghost-parser.ts`
  - Parses a Ghost export JSON, converts HTML → Markdown via Turndown, writes MDX to `src/content/blog` or `src/content/de` based on the `de` tag.
  - Important: the JSON path is hardcoded to `../neurohackingly-by-lukas-zangerl.ghost.2025-10-08-04-23-04.json`. Update that path before running.
  - Skips posts with empty HTML and removes the `de` tag from frontmatter.

- `npm run migrate-images` → `scripts/migrate-images.ts`
  - Copies images from `ghost-import-temp/ghost-import/content/images/{slug}/` to `public/images/{slug}/` and rewrites references in MDX/frontmatter.
  - Supports `--dry-run` to preview changes.

Additional utilities present in `scripts/` (one‑offs, optional):
`FINAL-clean-all-ghost-artifacts.sh`, `categorize-errors.sh`, `clean-*.py`, `comprehensive-ghost-cleanup.py`, `convert-gifs-to-video.ts`, `fix-*.py`, `identify-failing-files.sh`, `iterative-fix-loop.sh`, `migrate-heroes-to-assets.ts`, `replace-gifs-in-mdx.ts`, `test-deployment.sh`.

## Build and deployment

- Config: `astro.config.mjs` uses `@astrojs/vercel` adapter with `output: 'static'` and integrations: MDX + sitemap. Site URL is `https://neurohackingly.com`.
- Vercel: This repo is already configured for Vercel (adapter present). Use standard Vercel static hosting. No environment variables are required by default.
- Docker: No Dockerfile is currently committed. If you need containerized deploys, add a Dockerfile or use Vercel.

## Gotchas and troubleshooting

- Content schema errors: missing `title`, `description`, or `pubDate` will fail the build. Fix frontmatter per `src/content/config.ts`.
- Missing social image: add `public/og-image.jpg` or adjust the default in `SEO.astro` to avoid 404s.
- German posts not visible: routes for `de` are not implemented yet—add `/src/pages/de/*`.
- Image strategy: Prefer `hero` (Astro Assets) for optimized images. Fallback `image.url` supports legacy URLs under `public/images/{slug}/...`.
- RSS only includes English posts (blog collection). Extend if needed.

## Housekeeping

- Do not commit: `dist/`, `.astro/`, `node_modules/` (already in `.gitignore`).
- Editor/host metadata like `.vscode/` and `.vercel/` are optional and typically not required for CI builds.

---

If you need a new automation or refactor, prefer adding a small script under `scripts/` and wiring it with an npm script in `package.json`. Keep content validation strict and avoid ad‑hoc frontmatter fields not covered by the schema.
