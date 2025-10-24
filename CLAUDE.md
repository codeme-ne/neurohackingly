# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astro-based static blog for neurohackingly.com. Migrated from Ghost CMS, featuring bilingual content (English/German), deployed to Vercel with Docker support.

## Build & Development Commands

```bash
# Development
npm run dev                    # Dev server at localhost:4321

# Production
npm run build                  # Build static site to ./dist/
npm run preview                # Preview production build locally

# Content Migration
npm run parse-ghost            # Parse Ghost CMS export to MDX (scripts/ghost-parser.ts)

# Docker (see DOCKER_DEPLOYMENT.md for full guide)
docker build -t neurohackingly-blog .                    # Production build
docker-compose up blog                                   # Production via compose
docker-compose --profile dev up blog-dev                 # Dev with hot-reload
```

## Architecture

### Content Collections System

Two separate content collections in `src/content/`:
- `blog/` - English posts (MDX files)
- `de/` - German posts (MDX files)

**Collection schema** (`src/content/config.ts`):
- Both collections share identical Zod schema
- Required fields: `title`, `description`, `pubDate`
- Optional: `updatedDate`, `image {url, alt}`, `tags[]`, `featured`, `draft`
- Default author: "Lukas Zangerl"

**Dynamic routing**:
- `src/pages/blog/[slug].astro` - Renders individual posts from `blog` collection
- Filters out drafts via `getCollection('blog', ({ data }) => !data.draft)`
- Uses `post.id` as slug (MDX filename without extension)

### Layouts & Components

**BlogPost.astro** (`src/layouts/BlogPost.astro`):
- Main blog post wrapper
- Calculates reading time (~200 words/min)
- Injects Schema.org structured data (`BlogPosting`)
- Navigation: Home, Blog, Newsletter
- Metadata display: pubDate, readingTime, author, tags

**SEO.astro** (`src/components/SEO.astro`):
- Centralized meta tag management
- Handles Open Graph, Twitter Cards
- Article-specific meta (publishedTime, modifiedTime)

### Ghost CMS Migration

**ghost-parser.ts** (`scripts/ghost-parser.ts`):
- Parses Ghost JSON export format
- Converts HTML to Markdown via Turndown
- Preserves code blocks with fenced syntax
- Routes posts to `blog/` or `de/` based on `de` tag
- Generates frontmatter with all required fields
- Outputs MDX files to `src/content/{blog|de}/`

**Critical behavior**:
- Skips posts with no HTML content
- Removes `de` tag from frontmatter tags array
- Uses `post.slug` as filename (e.g., `how-to-learn.mdx`)
- Hardcoded JSON path: `../neurohackingly-by-lukas-zangerl.ghost.2025-10-08-04-23-04.json`

### Deployment Configuration

**Vercel** (`astro.config.mjs`):
- Adapter: `@astrojs/vercel` with web analytics
- Output: `static` (pre-rendered at build time)
- Integrations: MDX, Sitemap
- Site URL: `https://neurohackingly.com`

**Docker** (see `DOCKER_DEPLOYMENT.md`):
- Multi-stage build: node:20-alpine (builder) + nginx:alpine (runtime)
- Production image: 55.8MB
- Non-root user (astro:astro, UID 1001)
- Health checks, gzip, security headers
- Dev mode available via `Dockerfile.dev`

### Markdown Configuration

Syntax highlighting via Shiki:
- Theme: `github-dark-dimmed`
- Line wrapping enabled

## Key Patterns

**Adding new blog posts**:
1. Create MDX file in `src/content/blog/` (English) or `src/content/de/` (German)
2. Include required frontmatter (see schema in `config.ts`)
3. Set `draft: false` when ready to publish
4. Filename becomes the slug (e.g., `my-post.mdx` → `/blog/my-post`)

**Content validation**:
- Astro validates against Zod schema at build time
- Missing required fields will fail the build
- `draft: true` posts are excluded from `getStaticPaths()`

**Migration workflow** (Ghost → Astro):
1. Export Ghost JSON via Ghost admin
2. Place JSON in parent directory (hardcoded path in script)
3. Run `npm run parse-ghost`
4. Review generated MDX in `src/content/`
5. Commit to Git

## Repository Context

**Git status shows**:
- Recent Docker deployment infrastructure added
- Comprehensive Ghost cleanup completed
- Migration testing infrastructure in place
- Main branch: `master`

**Notable directories**:
- `scripts/` - Python/TypeScript utilities for migration and cleanup
- `public/` - Static assets served as-is
- `dist/` - Build output (excluded from Git)
