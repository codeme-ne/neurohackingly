# Phase 1: GIF → Video Conversion - Execution Guide

## ✅ Completed Setup

**Branch:** `media-optimization`

**Baseline Metrics:**
- Total size: 594M
- GIF files: 36
- Posts with GIFs: 36 references
- Largest GIF: 47.2MB
- Top 20 GIFs: ~135MB

**Created Files:**
1. `scripts/convert-gifs-to-video.ts` - Batch GIF→MP4/WebM/JPG converter
2. `scripts/replace-gifs-in-mdx.ts` - Auto-rewrite MDX ![](*.gif) → `<GifVideo />`
3. `src/components/GifVideo.astro` - Video component (autoplay, loop, poster)
4. Updated templates with `loading="lazy" decoding="async"`

## 🚀 Next Steps (Manual Execution Required)

### Step 1: Install ffmpeg

```bash
sudo apt-get update && sudo apt-get install ffmpeg
```

Verify:
```bash
ffmpeg -version
```

### Step 2: Convert GIFs (Dry Run First)

Test what will be converted:
```bash
npx tsx scripts/convert-gifs-to-video.ts --dry-run
```

**Expected:** Shows 36 GIFs to convert

Run conversion (this will take 5-10 minutes):
```bash
npx tsx scripts/convert-gifs-to-video.ts
```

**Output:** For each GIF, creates:
- `.mp4` (H.264, CRF 23, ~80-90% smaller)
- `.webm` (VP9, CRF 30, alternative format)
- `.jpg` (poster frame, prevents CLS)

### Step 3: Update MDX Files (Dry Run First)

Test MDX replacements:
```bash
npx tsx scripts/replace-gifs-in-mdx.ts --dry-run
```

**Expected:** Shows 36 replacements

Apply changes:
```bash
npx tsx scripts/replace-gifs-in-mdx.ts --backup
```

**Effect:**
- `![alt](/images/path/file.gif)` → `<GifVideo alt="alt" webm="/images/path/file.webm" mp4="/images/path/file.mp4" poster="/images/path/file.jpg" />`
- Adds `import GifVideo from '../../components/GifVideo.astro';` to affected files
- Creates `.bak` backups

### Step 4: Test Build

```bash
npm run build
```

**Expected:** Clean build, no errors

### Step 5: Visual QA

```bash
npm run dev
```

**Check:**
- [ ] Videos autoplay (muted, looping)
- [ ] Poster visible before playback
- [ ] No layout shifts (CLS)
- [ ] Fallback `<img>` visible in no-JS environments

**Test Posts:**
- `/blog/how-to-double-reading-speed` (47MB GIF → ~5MB video)
- `/blog/7-nlp-hacks-to-step-into-your-ultimate-potential` (multiple GIFs)
- `/blog/creating-absolute-certainty-tony-robbins` (multiple GIFs)

### Step 6: Measure Savings

```bash
# New measurements
du -sh public/images
find public/images -type f -iname "*.mp4" -printf "%s\t%p\n" | sort -nr | head -20
```

**Expected reduction:** 80-90% on GIF sizes, 70%+ page weight on affected posts

### Step 7: Optional Cleanup

If everything works, remove original GIFs (after backup):
```bash
# Archive GIFs first (optional)
mkdir -p ../gif-backup
find public/images -type f -iname "*.gif" -exec cp --parents {} ../gif-backup \;

# Delete GIFs (they're replaced by videos)
find public/images -type f -iname "*.gif" -delete
```

## 🔄 Rollback Plan

If issues occur:

```bash
# Restore MDX files from backups
find src/content -name "*.mdx.bak" -exec bash -c 'mv "$0" "${0%.bak}"' {} \;

# Remove video files
find public/images -type f \( -iname "*.mp4" -o -iname "*.webm" \) -delete

# Revert templates
git checkout src/pages/index.astro src/pages/blog/index.astro src/layouts/BlogPost.astro

# Full revert
git reset --hard HEAD
```

## 📊 Success Criteria

- [ ] All 36 GIFs converted to MP4/WebM/JPG
- [ ] Build passes without errors
- [ ] Videos autoplay correctly (muted, looping)
- [ ] Zero CLS (poster + dimensions)
- [ ] 80-90% file size reduction on videos
- [ ] 70%+ page weight reduction on affected posts

## ⏭️ Next Phase

Once Phase 1 is validated, proceed to:
- **Phase 2:** Astro 5 `astro:assets` for hero images
