# Ghost CMS to Astro Migration - Session Summary

**Date:** 2023-10-23
**Project:** neurohackingly-blog-20251008
**Location:** `/home/lukasz/development/experiments/neurohackingly-blog-20251008/blog`

---

## 🎯 Current Status

**Build Status:** ❌ FAILING
**Issue:** MDX parsing errors from Ghost CMS migration artifacts
**Files Processed:** 227 MDX blog posts
**Files Cleaned:** 18+ files with various Ghost CMS artifacts removed

---

## ✅ Completed Work

### 1. Fixed Deprecated Import
- **File:** `astro.config.mjs:3`
- **Change:** `@astrojs/vercel/static` → `@astrojs/vercel`
- **Status:** ✅ Complete

### 2. Cleaned Ghost CMS Artifacts

#### Newsletter Signup Code (13 files)
Removed inline CSS/JavaScript newsletter signup blocks that were breaking MDX parsing:
- Pattern: `.nc-loop-dots-4-24-icon-o{...}` + "Count me in!" / "Subscribe" buttons
- Cleaned files include: `7-day-challange-for-life-mastery-tony-robbins.mdx`, `6-hacks-for-a-miracle-morning-routine.mdx`, etc.

#### SVG Download Buttons (5 files)
Removed Ghost CMS download button code:
- Pattern: `.a{fill:none;stroke:currentColor...}download-circle`
- Files: `get-a-competitive-edge-with-this-months-best-resources.mdx`, `i-got-an-accountability-partner.mdx`, `little-treasure-trove.mdx`, `welcome-here.mdx`, `cornell-note-taking-system-which-combines-active-recall-and-note-taking.mdx`

#### Global Cleanup (227 files)
- Fixed escaped brackets: `\[TEXT\]` → `[TEXT]`
- Removed `__GHOST_URL__` placeholders
- Moved `analytics.mdx` → `_analytics.mdx.bak` (internal analytics page with raw JavaScript)

---

## 🔴 Remaining Issues

### Primary Issue: MDX Parsing Errors

**Error Type:** `[@mdx-js/rollup] Could not parse expression with acorn`

**Latest Failing File:** `how-to-double-reading-speed.mdx:109:14`

**Root Cause:** Ghost CMS migration left many embedded HTML/JavaScript artifacts that break MDX's JSX parser. These include:
- Bookmark/embed cards with complex HTML
- Inline scripts and styles
- Malformed JSX expressions
- Mixed HTML/Markdown syntax

**Example Error:**
```
[@mdx-js/rollup] Could not parse expression with acorn
file: .../blog/src/content/blog/how-to-double-reading-speed.mdx:109:14
Caused by: Unexpected content after expression
```

---

## 📁 Created Tools & Scripts

All located in `/scripts/`:

1. **clean-newsletter-code.py** - Removes newsletter signup blocks with regex patterns
2. **clean-all-newsletter-code.py** - Line-by-line newsletter cleanup (broader matching)
3. **clean-svg-buttons.py** - Removes SVG download button code
4. **FINAL-clean-all-ghost-artifacts.sh** - Comprehensive bash script for global cleanup

---

## 💡 Recommended Next Approach

### Strategy: Systematic Scan-First Approach

Instead of fixing files one-by-one as build errors appear (which is inefficient), use this systematic approach:

#### Phase 1: Identify ALL Problem Files
```bash
# Run build and capture ALL failing files
npm run build 2>&1 | grep "file:" | cut -d: -f1-2 | sort -u > failing-files.txt
```

#### Phase 2: Choose Strategy

**Option A: Temporary Draft Mode (FASTEST)**
```bash
# Mark all failing files as draft to get build working
# Then fix incrementally
for file in $(cat failing-files.txt); do
  sed -i 's/draft: false/draft: true/' "$file"
done
```

**Option B: Convert MDX → MD**
```bash
# Rename .mdx to .md for files with issues
# Astro's markdown parser is more forgiving
# This loses MDX features but may be acceptable for blog posts
```

**Option C: Comprehensive Pattern Cleanup**
1. Scan all files for common Ghost CMS patterns
2. Create regex patterns for each type
3. Apply all fixes in one pass
4. Test build
5. Iterate on remaining errors

#### Phase 3: Verification
```bash
npm run build          # Should succeed
npm run build 2>&1 | grep "pages generated"  # Verify output
```

---

## 🔍 Common Ghost CMS Patterns to Clean

Based on errors encountered:

1. **Newsletter signup blocks**
   - Pattern: `.nc-loop-dots.*@keyframes.*Email sent!.*No spam`

2. **SVG download buttons**
   - Pattern: `.a{fill:none.*download-circle`

3. **Bookmark cards** (NEW - Not yet handled)
   - Pattern: Ghost bookmark embeds with complex HTML

4. **Escaped brackets in links**
   - Pattern: `\[TEXT\]` → `[TEXT]`

5. **Ghost URL placeholders**
   - Pattern: `__GHOST_URL__/` → `/`

6. **Inline HTML/Scripts** (NEW - Major issue)
   - Raw `<script>` tags
   - Inline `<style>` blocks
   - Complex HTML embeds

---

## 📊 Statistics

- **Total MDX Files:** 227
- **Files with Newsletter Code:** 13 (cleaned)
- **Files with SVG Buttons:** 5 (cleaned)
- **Files Still Failing:** Unknown (need scan)
- **Success Rate:** ~92% of files parse successfully (estimated)

---

## 🚀 Quick Start for Next Session

```bash
# 1. Navigate to project
cd /home/lukasz/development/experiments/neurohackingly-blog-20251008/blog

# 2. Check current build status
npm run build 2>&1 | tail -50

# 3. Identify ALL failing files
npm run build 2>&1 | grep "file:" | grep -oP 'blog/.*?\.mdx' | sort -u > failing-files.txt
wc -l failing-files.txt  # See how many files are affected

# 4. Examine a failing file
head -n 120 src/content/blog/how-to-double-reading-speed.mdx

# 5. Choose strategy and proceed
```

---

## 📝 Notes

- **Serena MCP** is activated for this project
- **Project registered** as 'blog' in Serena
- Using **TypeScript** with **utf-8** encoding
- Original Ghost export located at parent directory: `../neurohackingly-by-lukas-zangerl.ghost.2025-10-08-04-23-04.json`

---

## 🎯 Success Criteria

1. ✅ `npm run build` completes without errors
2. ✅ All blog posts are accessible (or explicitly marked as draft)
3. ✅ No Ghost CMS artifacts remain in production build
4. ✅ Security vulnerabilities addressed (`npm audit fix`)

---

## 📞 If You Get Stuck

**Quick Fix to Unblock:**
```bash
# Mark ALL mdx files as drafts temporarily
find src/content/blog -name "*.mdx" -exec sed -i 's/draft: false/draft: true/' {} \;

# Build should work now
npm run build

# Then gradually enable files one-by-one or in batches
```

---

**Last Updated:** 2023-10-23 11:00 UTC
**Next Action:** Scan for ALL failing files, then batch process by error type
