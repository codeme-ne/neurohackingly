# Media Optimization - Quick Start Guide

## 🚀 Ready to Execute

**Branch:** `media-optimization` (created)
**Build Status:** ✅ Validated (229 pages)
**Infrastructure:** ✅ Complete

## 📦 What's Been Created

### **Phase 1: GIF → Video**
- ✅ `scripts/convert-gifs-to-video.ts` - Batch GIF converter
- ✅ `scripts/replace-gifs-in-mdx.ts` - Auto MDX rewriter
- ✅ `src/components/GifVideo.astro` - Video component
- ✅ Lazy loading added to all image templates

### **Phase 2: Hero Image Optimization**
- ✅ `scripts/migrate-heroes-to-assets.ts` - Asset migrator
- ✅ `src/content/config.ts` - Extended with `hero: image()`
- ✅ All templates updated with `<Image />` + fallback
- ✅ `src/components/Video.astro` - Generic video player

### **Documentation**
- ✅ `PHASE1_EXECUTION.md` - Step-by-step Phase 1 guide
- ✅ `PHASE2_EXECUTION.md` - Step-by-step Phase 2 guide
- ✅ `MEDIA_OPTIMIZATION_SUMMARY.md` - Complete architecture
- ✅ `QUICKSTART.md` - This file

## ⚡ Execute in 5 Steps

### 1️⃣ Install ffmpeg
```bash
sudo apt-get update && sudo apt-get install ffmpeg
```

### 2️⃣ Convert GIFs (Phase 1)
```bash
# Dry run first
npx tsx scripts/convert-gifs-to-video.ts --dry-run

# Execute
npx tsx scripts/convert-gifs-to-video.ts
```

**Expected:** 36 GIFs → MP4/WebM/poster (80-90% size reduction)

### 3️⃣ Update MDX Files
```bash
# Dry run first
npx tsx scripts/replace-gifs-in-mdx.ts --dry-run

# Execute with backups
npx tsx scripts/replace-gifs-in-mdx.ts --backup
```

**Expected:** 36 MDX files updated with `<GifVideo />` component

### 4️⃣ Migrate Hero Images (Phase 2)
```bash
# Test with 5 posts first
npx tsx scripts/migrate-heroes-to-assets.ts --dry-run --limit 5
npx tsx scripts/migrate-heroes-to-assets.ts --limit 5

# If successful, migrate all
npx tsx scripts/migrate-heroes-to-assets.ts
```

**Expected:** Hero images → `src/assets/heroes/` with AVIF/WebP optimization

### 5️⃣ Build & Deploy
```bash
# Build
npm run build

# Preview
npm run preview

# Deploy
git add -A
git commit -m "feat: optimize media (GIF→video + Astro 5 assets)"
git push origin media-optimization
```

## 📊 Expected Results

### Before
```
Total Size:     594M
GIF Files:      36 files (135MB top 20)
Hero Images:    ~500KB avg JPG/PNG
Page Weight:    Heavy (GIFs + large images)
```

### After
```
GIF → Video:    ~90% size reduction (135MB → ~13MB)
Hero Images:    ~50-80% reduction (AVIF/WebP)
Page Weight:    70%+ lighter on affected posts
CLS:            Zero (poster + dimensions)
```

## 🎯 Success Criteria

- [ ] All 36 GIFs converted to video
- [ ] All GIF references updated in MDX
- [ ] Hero images generating AVIF/WebP variants
- [ ] Build completes without errors
- [ ] Visual QA passes (videos autoplay, images responsive)
- [ ] Zero CLS on all pages

## 📖 Detailed Guides

- **Phase 1:** See `PHASE1_EXECUTION.md`
- **Phase 2:** See `PHASE2_EXECUTION.md`
- **Architecture:** See `MEDIA_OPTIMIZATION_SUMMARY.md`

## 🔄 Rollback

If issues occur:
```bash
git reset --hard HEAD  # Nuclear option
# OR selective rollback (see PHASE1_EXECUTION.md / PHASE2_EXECUTION.md)
```

## 🆘 Troubleshooting

**Build fails:**
```bash
npm run build 2>&1 | grep -i error
```

**Videos don't play:**
- Check browser console for errors
- Verify MP4/WebM files exist in `public/images/`
- Check `<GifVideo />` import in MDX files

**Images not optimized:**
- Verify `hero:` field in frontmatter
- Check `src/assets/heroes/{slug}/` directory exists
- Rebuild: `rm -rf dist/ && npm run build`

## 📞 Support

- Review baseline metrics in this chat history
- Check execution guides for detailed steps
- Build output shows 229 pages successfully generated

**All infrastructure validated and ready to execute! 🎉**
