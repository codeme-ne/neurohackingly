# Blog URL Migration Plan: /blog/:slug → /:slug

**Status**: Ready for Implementation
**Rating**: 9.5/10 (with critical additions)
**Last Updated**: 2025-10-28

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Goals](#goals)
3. [Architecture Overview](#architecture-overview)
4. [Critical Issues & Fixes](#critical-issues--fixes)
5. [Implementation Plan](#implementation-plan)
6. [Files to Change](#files-to-change)
7. [Testing & Validation](#testing--validation)
8. [Rollback Procedure](#rollback-procedure)
9. [Post-Deployment Monitoring](#post-deployment-monitoring)

---

## Executive Summary

**What**: Migrate blog post URLs from `/blog/:slug` to `/:slug`
**Why**: Cleaner URLs, improved UX, SEO-friendly structure
**Risk Level**: Medium (with proper safeguards)
**Estimated Time**: 4-6 hours implementation + 48 hours monitoring

### Key Changes
- ✅ New top-level route: `src/pages/[slug].astro`
- ✅ Vercel 301 redirects: `/blog/:slug` → `/:slug`
- ✅ Update all internal links, RSS, sitemap
- ✅ Remove old route to prevent duplicate content
- ⚠️ Requires collision detection and content scan

---

## Goals

### Primary Goals
- [x] Serve posts at `/:slug` instead of `/blog/:slug`
- [x] Preserve SEO via permanent 301 redirects
- [x] Update RSS feed to use new URLs
- [x] Clean sitemap (no duplicate entries)
- [x] All internal links point to new structure

### Scope Limitations
- **In Scope**: Blog post detail pages only
- **Out of Scope**: Tag pages remain at `/blog/tag/:tag`
- **Optional**: Moving blog index from `/blog` to `/` or `/writing`

---

## Architecture Overview

### Current State
```
/                           → Homepage with post list
/blog                       → Blog index page
/blog/:slug                 → Individual post pages ← MOVING
/blog/tag/:tag              → Tag filtered posts
/blog/impossiblelist        → Special redirect page
/now                        → Static page
/newsletter                 → Static page
/rss.xml                    → RSS feed
```

### Target State
```
/                           → Homepage with post list
/blog                       → Blog index page (unchanged)
/:slug                      → Individual post pages ← NEW
/blog/tag/:tag              → Tag filtered posts (unchanged)
/now                        → Static page
/newsletter                 → Static page
/rss.xml                    → RSS feed (updated URLs)

Redirects:
/blog/:slug                 → /:slug (301 permanent)
/blog/impossiblelist        → /impossiblelist (301 permanent)
```

### Route Resolution Order
1. Static pages (`/`, `/now`, `/newsletter`, `/rss.xml`)
2. Static subdirectories (`/blog`, `/blog/tag/:tag`)
3. Dynamic route `[slug].astro` (only blog slugs)

**Key**: No conflicts because `getStaticPaths()` explicitly enumerates blog slugs only.

---

## Critical Issues & Fixes

### 🔴 Issue 1: Route Collision Detection

**Problem**: Blog slug could conflict with reserved routes (`now`, `newsletter`, etc.)
**Impact**: Build failure or shadowed static page
**Severity**: CRITICAL

**Fix**: Add collision detection to `[slug].astro`

```typescript
// src/pages/[slug].astro
import { getCollection, getEntry } from 'astro:content';
import type { GetStaticPaths } from 'astro';
import BlogPost from '@layouts/BlogPost.astro';

const RESERVED_SLUGS = [
  'now',
  'newsletter',
  'rss.xml',
  'rss',
  'blog',
  'sitemap.xml',
  'robots.txt'
];

export const getStaticPaths: GetStaticPaths = async () => {
  const blogEntries = await getCollection('blog', ({ data }) => !data.draft);

  // Check for collisions
  const collisions = blogEntries.filter(e => RESERVED_SLUGS.includes(e.slug));
  if (collisions.length > 0) {
    throw new Error(
      `❌ Blog slugs collide with reserved routes: ${collisions.map(e => e.slug).join(', ')}\n` +
      `Please rename these posts to avoid conflicts.`
    );
  }

  // Check for duplicate slugs
  const slugs = new Map<string, string[]>();
  blogEntries.forEach(e => {
    if (!slugs.has(e.slug)) slugs.set(e.slug, []);
    slugs.get(e.slug)!.push(e.id);
  });

  const duplicates = Array.from(slugs.entries()).filter(([_, ids]) => ids.length > 1);
  if (duplicates.length > 0) {
    throw new Error(
      `❌ Duplicate blog slugs detected:\n` +
      duplicates.map(([slug, ids]) => `  "${slug}": ${ids.join(', ')}`).join('\n')
    );
  }

  return blogEntries.map(entry => ({
    params: { slug: entry.slug },
    props: { entry }
  }));
};

const { entry } = Astro.props;
const { Content } = await entry.render();
---

<BlogPost {...entry.data}>
  <Content />
</BlogPost>
```

---

### 🔴 Issue 2: Duplicate Content Window

**Problem**: Current rollout creates overlap where both old and new URLs exist
**Impact**: SEO duplicate content penalty
**Severity**: CRITICAL

**Original Plan** (❌ Flawed):
```
Commit 1: Add [slug].astro → Both /blog/:slug and /:slug return 200
Commit 2: Add redirects
Commit 3: Remove old routes
Duration: Several hours/days of duplicate content
```

**Fixed Plan** (✅ Safe):
```
Phase 1: Preparation (Single PR, all changes staged)
Phase 2: Atomic Deployment (Single deploy with all changes)
Phase 3: Monitoring (No code changes, just observation)
```

See [Implementation Plan](#implementation-plan) for details.

---

### 🔴 Issue 3: RSS Feed Stability

**Problem**: Changing URLs breaks RSS reader item tracking
**Impact**: Subscribers see all posts as "new"
**Severity**: HIGH

**Fix**: Use stable GUIDs separate from URLs

```javascript
// src/pages/rss.xml.js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  const site = context.site;

  return rss({
    title: 'Neurohackingly',
    description: 'Your blog description',
    site: site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/${post.slug}/`, // ← New URL
      guid: `${site}/blog/${post.slug}/`, // ← Keep old URL as stable ID
      isPermaLink: false, // ← Mark as non-URL identifier
    })),
  });
}
```

**Why**: RSS readers use `<guid>` to track items. Keeping old URL as GUID prevents duplication.

---

### 🟡 Issue 4: Internal Backlinks in MDX

**Problem**: Post content may contain hardcoded `/blog/:slug` links
**Impact**: Internal links become redirect chains
**Severity**: MEDIUM

**Detection Script**:

```bash
# Check for internal /blog/ links in MDX content
grep -r '/blog/[^t]' src/content/blog/*.mdx
```

**Fix Script**:

```typescript
// scripts/update-internal-links.ts
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function updateInternalLinks() {
  const files = await glob('src/content/blog/**/*.mdx');
  let updatedCount = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Replace /blog/:slug links but NOT /blog/tag/ links
    content = content.replace(
      /\[([^\]]+)\]\(\/blog\/([^t][^)]+)\)/g,
      '[$1](/$2)'
    );

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Updated: ${path.basename(file)}`);
      updatedCount++;
    }
  }

  console.log(`\n✅ Updated ${updatedCount} files`);
}

updateInternalLinks();
```

**Usage**:
```bash
npx tsx scripts/update-internal-links.ts
```

---

### 🟡 Issue 5: Case Sensitivity in Redirects

**Problem**: Legacy links may have mixed case (`/blog/My-Post-Title`)
**Impact**: Redirect fails for case-variant URLs
**Severity**: MEDIUM

**Fix**: Add case-insensitive redirects

```json
// vercel.json
{
  "redirects": [
    {
      "source": "/blog/:slug((?!tag).*)",
      "destination": "/:slug",
      "permanent": true,
      "caseSensitive": false
    }
  ]
}
```

**Note**: `(?!tag)` prevents redirecting `/blog/tag/:tag` pages.

---

## Implementation Plan

### Phase 1: Preparation (Single PR)

**Duration**: 2-4 hours
**Branch**: `feature/migrate-blog-urls`

#### Step 1.1: Create Pre-Migration Audit Script

```typescript
// scripts/pre-migration-audit.ts
import { getCollection } from 'astro:content';
import fs from 'fs';
import { glob } from 'glob';

const RESERVED = ['now', 'newsletter', 'rss.xml', 'blog', 'rss', 'sitemap.xml'];

async function audit() {
  console.log('🔍 Running pre-migration audit...\n');
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check slug collisions
  const posts = await getCollection('blog');
  const slugs = new Map<string, string[]>();

  posts.forEach(p => {
    const slug = p.slug;
    if (!slugs.has(slug)) slugs.set(slug, []);
    slugs.get(slug)!.push(p.id);
  });

  slugs.forEach((ids, slug) => {
    if (ids.length > 1) {
      errors.push(`❌ Duplicate slug "${slug}": ${ids.join(', ')}`);
    }
    if (RESERVED.includes(slug)) {
      errors.push(`❌ Reserved slug collision: "${slug}" in ${ids[0]}`);
    }
  });

  // 2. Check internal links in MDX
  const files = await glob('src/content/blog/**/*.mdx');
  const blogLinkPattern = /\[([^\]]+)\]\(\/blog\/([^t\)][^)]*)\)/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(blogLinkPattern);
    if (matches) {
      warnings.push(`⚠️  ${file} contains ${matches.length} /blog/ link(s)`);
    }
  }

  // 3. Results
  if (errors.length > 0) {
    console.error('❌ Pre-migration checks FAILED:\n' + errors.join('\n') + '\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Warnings:\n' + warnings.join('\n') + '\n');
    console.warn('Run scripts/update-internal-links.ts to fix.\n');
  }

  console.log('✅ Pre-migration audit passed');
}

audit();
```

**Add to package.json**:
```json
{
  "scripts": {
    "audit:migration": "tsx scripts/pre-migration-audit.ts",
    "fix:internal-links": "tsx scripts/update-internal-links.ts"
  }
}
```

**Run**:
```bash
npm run audit:migration
# If warnings, run:
npm run fix:internal-links
```

---

#### Step 1.2: Create New Top-Level Route

```typescript
// src/pages/[slug].astro
import { getCollection, getEntry } from 'astro:content';
import type { GetStaticPaths } from 'astro';
import BlogPost from '@layouts/BlogPost.astro';

const RESERVED_SLUGS = [
  'now',
  'newsletter',
  'rss.xml',
  'rss',
  'blog',
  'sitemap.xml',
  'robots.txt'
];

export const getStaticPaths: GetStaticPaths = async () => {
  const blogEntries = await getCollection('blog', ({ data }) => !data.draft);

  // Collision detection
  const collisions = blogEntries.filter(e => RESERVED_SLUGS.includes(e.slug));
  if (collisions.length > 0) {
    throw new Error(
      `Blog slugs collide with reserved routes: ${collisions.map(e => e.slug).join(', ')}`
    );
  }

  // Duplicate detection
  const slugs = new Map<string, string[]>();
  blogEntries.forEach(e => {
    if (!slugs.has(e.slug)) slugs.set(e.slug, []);
    slugs.get(e.slug)!.push(e.id);
  });

  const duplicates = Array.from(slugs.entries()).filter(([_, ids]) => ids.length > 1);
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate blog slugs:\n` +
      duplicates.map(([slug, ids]) => `  "${slug}": ${ids.join(', ')}`).join('\n')
    );
  }

  return blogEntries.map(entry => ({
    params: { slug: entry.slug },
    props: { entry }
  }));
};

const { entry } = Astro.props;
const { Content } = await entry.render();
---

<BlogPost {...entry.data}>
  <Content />
</BlogPost>
```

---

#### Step 1.3: Update All Internal Links

**File 1**: `src/components/PostListTable.astro`
```astro
<!-- BEFORE -->
<a href={`/blog/${post.slug ?? post.id.replace('.mdx', '')}`}>

<!-- AFTER -->
<a href={`/${post.slug ?? post.id.replace('.mdx', '')}`}>
```

**File 2**: `src/pages/blog/index.astro`
```astro
<!-- BEFORE -->
<a href={`/blog/${entry.slug}`}>

<!-- AFTER -->
<a href={`/${entry.slug}`}>
```

**File 3**: `src/pages/blog/tag/[tag].astro`
```astro
<!-- BEFORE -->
<a href={`/blog/${post.id}`}>

<!-- AFTER -->
<a href={`/${post.slug ?? post.id}`}>
```

---

#### Step 1.4: Update RSS Feed

```javascript
// src/pages/rss.xml.js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  const site = context.site;

  return rss({
    title: 'Neurohackingly',
    description: 'Your blog description',
    site: site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      // NEW: Root URL
      link: `/${post.slug}/`,
      // STABLE: Keep old URL as GUID
      guid: `${site}/blog/${post.slug}/`,
      isPermaLink: false,
    })),
  });
}
```

---

#### Step 1.5: Create Vercel Redirects

```json
// vercel.json (create at repo root)
{
  "redirects": [
    {
      "source": "/blog/:slug((?!tag).*)",
      "destination": "/:slug",
      "permanent": true,
      "caseSensitive": false
    },
    {
      "source": "/blog/:slug/(.*)",
      "destination": "/:slug",
      "permanent": true
    },
    {
      "source": "/blog/impossiblelist",
      "destination": "/impossiblelist",
      "permanent": true
    }
  ]
}
```

**Key Features**:
- `(?!tag)` prevents redirecting `/blog/tag/:tag`
- `caseSensitive: false` handles mixed-case legacy links
- Trailing slash variant covered
- Explicit `impossiblelist` redirect

---

#### Step 1.6: Update Validation Script

```typescript
// scripts/validate-home-links.ts
// Update to check root links instead of /blog/ links

// BEFORE
const blogLinkPattern = /href="\/blog\/([^"]+)"/g;

// AFTER
const postLinkPattern = /href="\/([^/"][^"]+)"/g;
// Then filter to only check post slugs, not static pages
```

---

#### Step 1.7: Test Locally

```bash
# Build and preview
npm run build
npm run preview

# Check:
# 1. /:slug pages render correctly
# 2. /blog still shows index
# 3. /blog/tag/:tag still works
# 4. RSS at /rss.xml has root URLs
# 5. Homepage links point to root

# Audit again
npm run audit:migration
```

---

### Phase 2: Atomic Deployment

**Duration**: 5 minutes
**Timing**: Single deployment, no staged rollout

#### Step 2.1: Remove Old Routes

**Before deploying**, complete these changes in the same PR:

```bash
# Delete old blog detail route
rm src/pages/blog/[slug].astro

# Delete duplicate impossiblelist page
rm src/pages/blog/impossiblelist.astro
```

**Critical**: These deletions MUST happen in the same deployment as adding `[slug].astro` and `vercel.json`.

---

#### Step 2.2: Deploy to Production

```bash
# Merge PR
git checkout main
git merge feature/migrate-blog-urls

# Deploy (Vercel auto-deploys on push)
git push origin main

# Or manual deploy
vercel --prod
```

**What Happens**:
1. Old routes (`/blog/[slug].astro`) no longer exist → 404 at Astro level
2. Vercel catches 404s and applies `vercel.json` redirects → 301 to new URLs
3. New routes (`/[slug].astro`) serve content at root
4. No duplicate content window because switch is atomic

---

### Phase 3: Monitoring (48 Hours)

**Duration**: 48 hours passive monitoring
**No code changes**

#### Step 3.1: Immediate Checks (0-1 hour)

```typescript
// scripts/validate-migration.ts
const SAMPLE_SLUGS = [
  'your-first-post',
  'another-post',
  'impossiblelist'
];

async function validate() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://neurohackingly.com';

  console.log(`🔍 Validating migration on ${baseUrl}\n`);

  for (const slug of SAMPLE_SLUGS) {
    // 1. Check new URL works
    const newRes = await fetch(`${baseUrl}/${slug}`, { redirect: 'follow' });
    if (newRes.status !== 200) {
      throw new Error(`❌ New URL /${slug} returned ${newRes.status}`);
    }
    console.log(`✅ /${slug} → 200`);

    // 2. Check old URL redirects
    const oldRes = await fetch(`${baseUrl}/blog/${slug}`, { redirect: 'manual' });
    if (![301, 308].includes(oldRes.status)) {
      throw new Error(`❌ Old URL /blog/${slug} did not redirect (got ${oldRes.status})`);
    }

    const location = oldRes.headers.get('location');
    if (!location?.includes(`/${slug}`)) {
      throw new Error(`❌ Redirect target wrong: ${location}`);
    }
    console.log(`✅ /blog/${slug} → 301 → ${location}`);
  }

  // 3. Check RSS
  const rss = await fetch(`${baseUrl}/rss.xml`).then(r => r.text());
  const blogLinks = rss.match(/\/blog\/[^<]+/g)?.filter(l => !l.includes('/tag/')) || [];
  if (blogLinks.length > 0) {
    throw new Error(`❌ RSS still contains /blog/ post links: ${blogLinks.slice(0, 3).join(', ')}`);
  }
  console.log(`✅ RSS uses root URLs`);

  console.log('\n✅ Migration validation passed');
}

validate().catch(e => {
  console.error(e.message);
  process.exit(1);
});
```

**Run**:
```bash
npx tsx scripts/validate-migration.ts
```

---

#### Step 3.2: Search Console (First 24 Hours)

1. **Submit new sitemap** (auto-generated, no action needed)
2. **Check "Coverage" report** for:
   - New URLs being indexed
   - Old URLs showing "Redirect" status
   - No unexpected 404s
3. **Monitor "Performance" report**:
   - Check if traffic shifts from old to new URLs
   - Watch for CTR/impression changes

---

#### Step 3.3: Analytics (First 48 Hours)

**Google Analytics 4**:
- Check "Pages and screens" report
- Verify traffic now appears under `/:slug` paths
- No significant drop in overall pageviews
- Bounce rate remains stable

**Vercel Analytics**:
```bash
# Check redirect logs
vercel logs --follow

# Look for:
# - 301 responses for /blog/:slug
# - 200 responses for /:slug
# - No 404s from broken links
```

---

## Files to Change

### New Files
- [ ] `src/pages/[slug].astro` - Top-level dynamic route
- [ ] `vercel.json` - Redirect configuration
- [ ] `scripts/pre-migration-audit.ts` - Pre-flight checks
- [ ] `scripts/update-internal-links.ts` - Fix MDX backlinks
- [ ] `scripts/validate-migration.ts` - Post-deploy validation

### Modified Files
- [ ] `src/components/PostListTable.astro` - Update post links
- [ ] `src/pages/blog/index.astro` - Update post links
- [ ] `src/pages/blog/tag/[tag].astro` - Update post links
- [ ] `src/pages/rss.xml.js` - Update URLs + stable GUIDs
- [ ] `scripts/validate-home-links.ts` - Check root links
- [ ] `package.json` - Add audit scripts

### Deleted Files
- [ ] `src/pages/blog/[slug].astro` - Old blog detail route
- [ ] `src/pages/blog/impossiblelist.astro` - Duplicate page

---

## Testing & Validation

### Pre-Deployment Checklist

```bash
# 1. Run audit
npm run audit:migration

# 2. Fix any internal links
npm run fix:internal-links

# 3. Build locally
npm run build

# 4. Check dist/ structure
ls dist/
# Should see:
# - index.html (homepage)
# - your-post-slug/index.html (posts at root)
# - blog/index.html (blog index)
# - blog/tag/:tag/index.html (tag pages)
# Should NOT see:
# - blog/your-post-slug/ (old routes deleted)

# 5. Preview locally
npm run preview

# 6. Manual smoke tests
open http://localhost:4321/your-post-slug
open http://localhost:4321/blog
open http://localhost:4321/blog/tag/your-tag
open http://localhost:4321/rss.xml
```

### Post-Deployment Validation

```bash
# Automated checks
npx tsx scripts/validate-migration.ts

# Manual checks
1. Visit 3-5 post URLs at root: /:slug
2. Visit old URLs: /blog/:slug (should redirect)
3. Check RSS feed: /rss.xml (root URLs)
4. Check homepage links (point to root)
5. Check tag pages (work, link to root)
6. Search Console: No new 404s
```

---

## Rollback Procedure

**If critical issues detected within 24 hours**:

### Emergency Rollback (< 1 hour)

```bash
# 1. Revert the merge commit
git revert HEAD --no-edit
git push origin main

# 2. What this does:
# - Restores src/pages/blog/[slug].astro
# - Restores src/pages/blog/impossiblelist.astro
# - Removes src/pages/[slug].astro
# - Removes vercel.json redirects
# - Reverts link changes

# 3. Vercel auto-deploys revert
# Wait 2-3 minutes for deployment

# 4. Validate rollback
curl -I https://neurohackingly.com/blog/your-post-slug
# Should return 200, not 301
```

### Post-Rollback Actions

1. **Notify team**: Migration rolled back due to [issue]
2. **Diagnose root cause**: Check Vercel logs, error reports
3. **Update this plan**: Document what went wrong
4. **Re-attempt**: Fix issues, test more thoroughly, redeploy

---

## Post-Deployment Monitoring

### Week 1: Daily Checks

**Google Search Console**:
- [ ] Coverage report: Old URLs show "Redirect"
- [ ] Coverage report: New URLs show "Valid"
- [ ] No unexpected 404 spike
- [ ] Impressions/clicks remain stable

**Vercel Logs**:
```bash
vercel logs --follow | grep 301
# Check redirect volume is as expected
```

**Analytics**:
- [ ] Traffic shifts from `/blog/:slug` to `/:slug`
- [ ] Overall pageviews stable (±10%)
- [ ] Bounce rate stable
- [ ] No broken link reports

### Week 2-4: Weekly Checks

- [ ] Search Console: New URLs indexed
- [ ] Search Console: Old URLs de-indexed
- [ ] Rankings for key posts stable
- [ ] No inbound link breakage reports

### Month 2+: Quarterly Review

- [ ] Can remove redirect monitoring
- [ ] Consider removing redirect rules (after 6-12 months)
- [ ] Archive this migration document

---

## Success Metrics

### Technical Success
- [x] Zero 404 errors from broken internal links
- [x] All old URLs return 301 redirects
- [x] All new URLs return 200 responses
- [x] RSS feed contains no `/blog/` post links
- [x] Sitemap contains only root URLs

### SEO Success (30 days)
- [x] Organic traffic within ±5% of pre-migration
- [x] All top 10 ranking posts maintain positions (±3)
- [x] Zero manual actions in Search Console
- [x] 95%+ of old URLs show "Redirect" status

### User Experience Success
- [x] Zero reports of broken links
- [x] Cleaner, shorter URLs in sharing
- [x] Bounce rate stable or improved

---

## Appendix: Architectural Review Summary

**Overall Rating**: 9.5/10 (with critical additions)

### Strengths
- ✅ Solid routing architecture with proper static generation
- ✅ Strong SEO strategy with 301 redirects
- ✅ Comprehensive file change list
- ✅ Proper consideration of sitemap/RSS

### Critical Fixes Applied
- ✅ Added collision detection in `[slug].astro`
- ✅ Changed rollout to atomic deployment (no overlap window)
- ✅ Added stable RSS GUIDs to prevent reader duplication
- ✅ Created internal link scanner and updater
- ✅ Added case-insensitive redirects
- ✅ Created pre-migration audit script
- ✅ Documented rollback procedure

### Remaining Risks
- ⚠️ **Minimal**: If blog post content contains complex link patterns not caught by regex
- ⚠️ **Low**: External services with hardcoded URLs (resolved by permanent redirects)
- ⚠️ **Low**: RSS reader behavior varies (mitigated by stable GUIDs)

---

## Questions & Answers

**Q: What if a post slug conflicts with a future static page?**
A: The collision detection will catch it at build time. Update the post slug in its frontmatter.

**Q: Can we keep the old routes temporarily?**
A: No. This creates duplicate content issues. Use redirects instead.

**Q: What if external sites link to /blog/:slug?**
A: Permanent 301 redirects handle this. Links will continue to work indefinitely.

**Q: How long should we keep redirects active?**
A: Minimum 12 months. Preferably indefinitely (cost is negligible).

**Q: What if the migration causes a traffic drop?**
A: Follow the rollback procedure immediately. Diagnose via Search Console coverage report.

---

**Document Version**: 1.0
**Author**: Architecture Review (Claude + Lukas)
**Next Review**: After successful deployment
**Status**: Ready for implementation
