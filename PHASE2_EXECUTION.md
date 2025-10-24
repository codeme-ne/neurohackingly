# Phase 2: Hero Image Optimization - Execution Guide

## ✅ Completed Setup

**Phase 2 Components:**
1. `src/content/config.ts` - Extended with `hero: image().optional()`
2. `scripts/migrate-heroes-to-assets.ts` - Hero image migration tool
3. `src/components/Video.astro` - Generic video component
4. Updated templates:
   - `src/pages/index.astro` - Home page with `<Image />` + fallback
   - `src/pages/blog/index.astro` - Blog listing with `<Image />` + fallback
   - `src/layouts/BlogPost.astro` - Post layout with `<Image />` + fallback

**Benefits:**
- Automatic AVIF/WebP generation (50-80% smaller than JPG/PNG)
- Responsive images with srcset
- Zero-config CDN optimization via Astro
- Backward-compatible with existing `image.url` fallback

## 🚀 Execution Steps

### Step 1: Test Build (Baseline)

Before migration, verify current build:
```bash
npm run build
```

**Expected:** Clean build, existing images work

### Step 2: Migrate Hero Images (Dry Run)

Test migration with first 5 posts:
```bash
npx tsx scripts/migrate-heroes-to-assets.ts --dry-run --limit 5
```

**Expected Output:**
```
📁 Processing blog/ (N files)
  🔄 Would migrate: post-slug
     Source: /images/post-slug/hero.jpg
     Dest:   ../../assets/heroes/post-slug/hero.jpg
```

**Check:** Verifies which posts have images to migrate

### Step 3: Migrate Sample Posts

Start with 5 posts to validate:
```bash
npx tsx scripts/migrate-heroes-to-assets.ts --limit 5
```

**Effect:**
- Creates `src/assets/heroes/{slug}/` directories
- Copies hero images from `public/images/` to `src/assets/heroes/`
- Adds `hero: ../../assets/heroes/{slug}/{filename}` to frontmatter
- Keeps `image.url` for backward compatibility

### Step 4: Test Build with Migrated Posts

```bash
npm run build
```

**Expected:**
- Build generates optimized images in `dist/_astro/`
- Output shows AVIF/WebP variants created
- No errors about missing images

**Check Build Output:**
```bash
ls -lh dist/_astro/ | head -20
```

Should see multiple formats per image (e.g., `hero_abc123.avif`, `hero_abc123.webp`, `hero_abc123.jpg`)

### Step 5: Visual QA

```bash
npm run dev
```

**Test Pages:**
- `/` - Home page recent posts
- `/blog` - Blog listing
- `/blog/{slug}` - Individual post with migrated hero

**Verify:**
- [ ] Hero images load correctly
- [ ] Responsive images (check Network tab for srcset)
- [ ] AVIF/WebP served in modern browsers
- [ ] No CLS (layout shift)
- [ ] Fallback to `image.url` works for non-migrated posts

**DevTools Check:**
```
Network Tab → Filter: Img
- Look for .avif or .webp in Type column
- Compare sizes: AVIF should be 50-80% smaller than original
```

### Step 6: Migrate Remaining Posts

If sample migration successful:
```bash
npx tsx scripts/migrate-heroes-to-assets.ts
```

**Expected:** Migrates all remaining posts with `image.url` frontmatter

### Step 7: Final Build

```bash
npm run build
```

**Measure Output:**
```bash
# Check generated asset sizes
du -sh dist/_astro/

# Count generated images
find dist/_astro/ -type f \( -iname "*.avif" -o -iname "*.webp" -o -iname "*.jpg" \) | wc -l
```

### Step 8: Production Preview

```bash
npm run preview
```

Test production build locally before deployment.

## 📊 Success Criteria

- [ ] All hero images migrated to `src/assets/heroes/`
- [ ] Build generates AVIF/WebP variants
- [ ] Hero images on homepage/listings use `<Image />`
- [ ] Fallback to `<img>` works for non-migrated posts
- [ ] No build errors or image 404s
- [ ] Responsive srcset generated correctly
- [ ] Page payload reduced by 50-80% for hero images
- [ ] Zero CLS (Cumulative Layout Shift)

## 🔍 Validation Checklist

**Build Validation:**
```bash
# Should show optimized images being generated
npm run build | grep -i "image\|avif\|webp"
```

**Runtime Validation:**
```bash
# Check if AVIF served (Chrome/Edge)
curl -H "Accept: image/avif,image/webp,image/*" https://localhost:4321/ | grep -o "avif"

# Check responsive srcset
curl https://localhost:4321/blog | grep -o "srcset"
```

**Performance Validation:**
- Use Lighthouse to check LCP (Largest Contentful Paint)
- Before migration: baseline LCP
- After migration: should improve by 30-50%

## 🎯 Optimization Targets

**Image Size Reduction:**
- Original JPG/PNG: 100% (baseline)
- WebP: ~70% of original
- AVIF: ~50% of original

**Example:**
- Original: 500KB JPG
- WebP: ~350KB (30% savings)
- AVIF: ~250KB (50% savings)

## 🔄 Rollback Plan

If issues occur:

```bash
# Remove hero frontmatter
git diff HEAD -- src/content/blog/*.mdx | grep "+hero:" | wc -l

# Revert frontmatter changes
git checkout -- src/content/

# Remove migrated assets
rm -rf src/assets/heroes/

# Revert templates
git checkout src/pages/index.astro src/pages/blog/index.astro src/layouts/BlogPost.astro

# Revert schema
git checkout src/content/config.ts
```

## 📝 Notes

**Incremental Migration:**
- Phase 2 doesn't break existing posts
- Posts without `hero:` automatically use `image.url` fallback
- Migrate in batches to reduce risk

**Future MP4 Optimization:**
- Use `<Video />` component for tutorial videos
- Provide WebM + MP4 sources
- Generate poster frames: `ffmpeg -i video.mp4 -vf "select=eq(n\,0)" -q:v 2 poster.jpg`

## ⏭️ Next Steps

Once Phase 2 validated:
1. Run final metrics comparison (see `FINAL_METRICS.md`)
2. Commit changes: `git add -A && git commit -m "feat: optimize images with Astro 5 assets + GIF→video"`
3. Deploy to Vercel: `git push origin media-optimization`
4. Monitor production performance
