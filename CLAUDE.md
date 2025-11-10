# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neurohackingly is a personal blog built with Astro 5, deployed to Vercel. The site features:
- MDX blog posts with content collections
- Newsletter integration via ConvertKit API
- RSS feed generation
- Server-side rendering (SSR) with Vercel adapter
- Tag-based content organization

**Site URL:** https://neurohackingly.com

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Upgrade Astro dependencies (interactive)
npm run upgrade:astro

# Validate homepage links (post-build)
npm run validate:home-links

# Validate links against running server
npm run validate:home-links -- --base http://localhost:4321

# Fix internal blog links in MDX files
npm run fix:internal-links

# Run pre-migration audit
npm run audit:migration
```

## Node.js Version

This project requires Node.js >= 22.0.0 and < 24.0.0 (specified in package.json engines).

## Architecture

### URL Structure Migration

The blog recently migrated from `/blog/:slug` to `/:slug` at the root level:

- **Old:** `/blog/my-post` → **New:** `/:my-post`
- **Tag pages:** `/blog/tag/:tag` → `/tag/:tag`
- **Redirects:** Vercel handles permanent redirects (see `vercel.json`)

**Important:** When creating new links or references:
- Blog posts are at root: `/:slug`
- Tags remain at: `/tag/:tag`
- Static pages: `/`, `/now`, `/newsletter`, `/blog`

### Content Collections

Content is stored in `src/content/blog/` as MDX files with frontmatter defined by Zod schema (`src/content/config.ts`):

```typescript
{
  title: string
  description: string
  pubDate: Date
  updatedDate?: Date
  author: string (default: 'Lukas Zangerl')
  image?: { url: string; alt: string }
  hero?: ImageMetadata  // Astro 5 optimized images
  tags: string[]
  topics: string[]
  readingTime?: number
  featured: boolean
  draft: boolean
}
```

**Draft posts** are filtered out in production (`!data.draft` filter).

### Pages & Routing

```
src/pages/
├── index.astro              # Homepage with all posts
├── [slug].astro             # Root-level blog posts (SSR)
├── blog/
│   ├── index.astro          # Blog archive
│   ├── [slug].astro         # Individual blog posts
│   ├── tag/[tag].astro      # Tag-filtered posts
│   └── impossiblelist.astro # Static page
├── tag/[tag].astro          # Root-level tag pages
├── now.astro                # /now page
├── newsletter.astro         # Newsletter signup
├── api/
│   └── subscribe.ts         # ConvertKit API endpoint
└── rss.xml.js               # RSS feed (preserves legacy GUIDs)
```

**Key routing notes:**
- `[slug].astro` uses both SSG (`getStaticPaths`) and SSR fallback
- RSS feed uses legacy `/blog/:slug` GUIDs to prevent duplicate entries in feed readers
- Tag pages dynamically generate based on content collection tags

### Components

```
src/components/
├── SEO.astro              # Meta tags, Open Graph, Twitter cards
├── ScrollProgress.astro   # Reading progress indicator
├── MinimalNav.astro       # Navigation header
├── Footer.astro           # Site footer with social links
├── PostListTable.astro    # Blog post listing
├── NewsletterSignup.astro # Email subscription form
└── GifVideo.astro         # Optimized GIF playback
```

### Layouts

- `src/layouts/BlogPost.astro` - Main blog post template with reading time calculation, hero images, and metadata

### ConvertKit Integration

Environment variables (set in `.env.local` or Vercel):

```bash
KIT_API_SECRET=xxx      # Preferred (server-side)
# OR
KIT_API_KEY=xxx         # Alternative

# Use ONE of:
KIT_FORM_ID=8189766     # Numeric form ID (preferred)
# OR
KIT_TAG_ID=xxx          # Numeric tag ID
```

**Finding Form ID:** Navigate to Kit → Grow → Forms → View embed code → Look for `data-sv-form="12345678"` (use the number, NOT `data-uid`).

The `/api/subscribe` endpoint handles subscriptions with comprehensive error handling and validation.

### Utility Scripts

All scripts are TypeScript (`tsx`):

1. **`scripts/validate-home-links.ts`**
   - Validates that all blog post links on homepage resolve correctly
   - Supports both file-based (dist/) and HTTP-based validation
   - Filters out static pages and tag pages

2. **`scripts/update-internal-links.ts`**
   - Batch updates MDX files to convert `/blog/:slug` → `/:slug`
   - Preserves `/blog/tag/` links (doesn't convert)

3. **`scripts/pre-migration-audit.ts`**
   - Pre-migration validation script

### Vercel Configuration

`vercel.json` handles:
- Runtime: Node.js 22.x
- Permanent redirects from old `/blog/*` URLs to root-level URLs
- Special handling for `/blog/impossiblelist` → `/impossiblelist`

### RSS Feed

The RSS feed (`/rss.xml`) maintains backward compatibility:
- Links point to new root URLs (`/:slug`)
- GUIDs use legacy `/blog/:slug` format to prevent duplicate entries in feed readers
- This ensures existing subscribers don't see duplicate posts

## Key Patterns

### Static Site Generation with SSR Fallback

Blog post pages use hybrid rendering:

```typescript
export const prerender = true;  // Pre-render at build time

export async function getStaticPaths() {
  // Generate paths at build time
}

// In SSR mode, manually fetch if needed
const { slug } = Astro.params;
if (!post) {
  const entry = await getEntry('blog', slug);
}
```

### Content Filtering

Always filter drafts in production:

```typescript
const posts = await getCollection('blog', ({ data }) => !data.draft);
```

### Image Optimization

Use Astro 5's native image optimization:

```typescript
hero?: ImageMetadata  // Import with `import { Image } from 'astro:assets'`
```

## Working with Blog Content

### Adding a New Post

1. Create MDX file in `src/content/blog/my-new-post.mdx`
2. Add required frontmatter (title, description, pubDate, etc.)
3. Set `draft: true` while writing
4. Set `draft: false` when ready to publish
5. Build and validate: `npm run build && npm run validate:home-links`

### Internal Links in MDX

Always use root-level paths:
- ✅ `[My Post](/my-post)`
- ✅ `[Tag](/tag/productivity)`
- ❌ `[My Post](/blog/my-post)` (old structure)

If you accidentally use `/blog/` paths, run `npm run fix:internal-links`.

## Astro Configuration

- **Output mode:** `server` (SSR)
- **Adapter:** Vercel with web analytics
- **Integrations:** MDX, Sitemap
- **Markdown:** Shiki syntax highlighting (github-dark-dimmed theme)

## TypeScript

Extends Astro's strict TypeScript config (`astro/tsconfigs/strict`). Type definitions auto-generated in `.astro/types.d.ts`.
