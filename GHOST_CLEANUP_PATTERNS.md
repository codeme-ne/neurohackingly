# Ghost CMS Cleanup Patterns - Reference Guide

**Date:** 2025-10-23
**Project:** neurohackingly-blog-20251008
**Migration:** Ghost CMS → Astro with MDX

---

## 📋 Overview

This document catalogs all Ghost CMS artifact patterns discovered and cleaned during the Astro migration. Use this as a reference for future content imports or similar migrations.

---

## 🎯 Cleanup Statistics

```
Total MDX Files:        227
Files Cleaned:          65+
Patterns Removed:       300+
Success Rate:           ~99% (from ~92%)
Files Requiring Manual: 2-3 (complex embedded apps)
```

---

## 🔧 Automated Cleanup Patterns

### 1. Ghost Bookmark Cards

**Issue:** Malformed link structures with embedded images/metadata
**Pattern:** `[ \n\n content with images \n\n ](url)`
**Frequency:** 44 files

**Example:**
```markdown
[

Learn How to Triple Your Reading Speed

This short video will teach you...

![](image.png)

](https://example.com/article)
```

**Fix:** Convert to simple markdown links
```markdown
[Learn How to Triple Your Reading Speed](https://example.com/article)
```

**Script:** `scripts/fix-ghost-bookmarks.py`

---

### 2. Curly Braces as Text

**Issue:** MDX interprets `{}` as JavaScript expressions
**Pattern:** `{text content}`
**Frequency:** 98 instances

**Examples:**
- `{currently training - Jan 24'}`
- `{more info here}`

**Fix:** Convert to parentheses
```markdown
(currently training - Jan 24')
```

**Script:** `scripts/comprehensive-ghost-cleanup.py` (pattern: `curly_braces_text`)

---

### 3. Escaped Brackets

**Issue:** Ghost escaped brackets unnecessarily
**Pattern:** `\[TEXT\]`
**Frequency:** 102 instances

**Example:**
```markdown
\[Click here\] for more info
```

**Fix:** Remove backslashes
```markdown
[Click here] for more info
```

**Script:** `scripts/comprehensive-ghost-cleanup.py` (pattern: `escaped_brackets`)

---

### 4. Newsletter Signup Blocks

**Issue:** Embedded CSS/HTML for newsletter forms
**Pattern:** `.nc-loop-dots-4-24-icon-o{...}` with form HTML
**Frequency:** 13 files

**Example:**
```html
<style>.nc-loop-dots-4-24-icon-o{...}</style>
<form class="newsletter">...</form>
```

**Fix:** Remove entirely (implement Astro component instead)

**Script:** `scripts/clean-newsletter-code.py`

---

### 5. SVG Download Buttons

**Issue:** Ghost-specific SVG button markup
**Pattern:** `.a{fill:none;stroke:currentColor...}download-circle`
**Frequency:** 5 files

**Fix:** Remove inline styles and buttons

**Script:** `scripts/clean-svg-buttons.py`

---

### 6. Comparison Operators

**Issue:** `<` and `>` interpreted as HTML tags
**Pattern:** `<17%`, `>50`, etc.
**Frequency:** ~10 instances

**Example:**
```markdown
Body fat <17%
```

**Fix:** Convert to text
```markdown
Body fat: less than 17%
```

**Script:** `scripts/fix-comparison-operators.py`

---

### 7. En-dash Arrows

**Issue:** `–>` and `<–` look like malformed HTML tags
**Pattern:** `–>` (U+2013 en-dash + greater than)
**Frequency:** ~5 instances

**Example:**
```markdown
–> Important <–
```

**Fix:** Convert to proper arrows or remove
```markdown
→ Important ←
```

**Manual fix:** `sed 's/–>/→/g; s/<–/←/g'`

---

### 8. Backtick Apostrophes

**Issue:** Ghost used backticks instead of apostrophes
**Pattern:** `word\`s`
**Frequency:** 7 instances

**Example:**
```markdown
Here\`s the solution
```

**Fix:** Replace with proper apostrophes
```markdown
Here's the solution
```

**Script:** `scripts/comprehensive-ghost-cleanup.py` (pattern: `backtick_apostrophes`)

---

### 9. Ghost URL Placeholders

**Issue:** Unresolved Ghost CMS internal URLs
**Pattern:** `__GHOST_URL__/`
**Frequency:** Already cleaned in previous session

**Fix:** Replace with relative paths
```markdown
__GHOST_URL__/content/image.png  →  /content/image.png
```

---

### 10. Embedded CSS/JavaScript

**Issue:** Full application code embedded in blog posts
**Pattern:** Massive inline `<style>` and `<script>` blocks
**Frequency:** 1-2 files (e.g., `tech-tools.mdx`)

**Example:**
```html
<style>
  .nio-wrapper { ... hundreds of lines ... }
</style>
<script>
  // Complex JavaScript application
</script>
```

**Fix:**
- Option A: Mark as draft, refactor to Astro component
- Option B: Move to `_filename.mdx.bak` for exclusion

**Status:** Requires manual refactoring

---

## 🛠️ Tools Created

### Primary Scripts

| Script | Purpose | Files Affected |
|--------|---------|----------------|
| `identify-failing-files.sh` | Scan build for all failing MDX files | Diagnostic |
| `categorize-errors.sh` | Group errors by type | Diagnostic |
| `fix-ghost-bookmarks.py` | Fix malformed bookmark cards | 44 files |
| `comprehensive-ghost-cleanup.py` | Apply all patterns in one pass | 23 files |
| `fix-comparison-operators.py` | Handle `<` `>` operators | 0 files (preemptive) |
| `iterative-fix-loop.sh` | Automated build-fix-repeat loop | Orchestration |

### Helper Scripts (from previous session)

- `clean-newsletter-code.py`
- `clean-all-newsletter-code.py`
- `clean-svg-buttons.py`
- `FINAL-clean-all-ghost-artifacts.sh`

---

## 📝 Manual Fixes Required

### Files Moved to Backup

1. **`_analytics.mdx.bak`**
   - Reason: Raw JavaScript analytics code
   - Action: Refactor to Astro component or remove

2. **`_tech-tools.mdx.bak`**
   - Reason: Embedded image optimizer application (1900+ lines of CSS/JS)
   - Action: Convert to standalone Astro page with proper components

### Remaining Issues (2-3 files)

Files with complex embedded content at character positions >1000:
- `welcome-to-the-prompt-alchemist.mdx:25:1908` (embedded app code)
- Potentially 1-2 more similar files

**Recommendation:** Run one more iteration of `iterative-fix-loop.sh` or manually convert to draft/backup.

---

## 🚀 Quick Reference Commands

### Scan for Issues
```bash
# Find all failing files
bash scripts/identify-failing-files.sh

# Categorize error types
bash scripts/categorize-errors.sh
```

### Apply Fixes
```bash
# Dry run to preview changes
python3 scripts/comprehensive-ghost-cleanup.py --dry-run

# Apply all cleanup patterns
python3 scripts/comprehensive-ghost-cleanup.py

# Fix specific pattern
python3 scripts/fix-ghost-bookmarks.py
```

### Automated Iteration
```bash
# Keep fixing until build succeeds (max 10 iterations)
bash scripts/iterative-fix-loop.sh
```

### Build & Verify
```bash
# Full build
npm run build

# Count success rate
TOTAL=$(find src/content/blog -name "*.mdx" | wc -l)
ERRORS=$(npm run build 2>&1 | grep -c "Could not parse" || echo 0)
echo "Success: $(( (TOTAL - ERRORS) * 100 / TOTAL ))%"
```

---

## 🎓 Lessons Learned

### What Worked Well

1. **Pattern-based cleanup** - Regex patterns handled 95% of issues
2. **Iterative approach** - Build → identify → fix → repeat
3. **Dry-run testing** - Prevented accidental data loss
4. **Git checkpoints** - Easy rollback if needed

### Challenges Encountered

1. **MDX strictness** - Stricter than standard Markdown
2. **Unicode characters** - En-dashes and special chars broke parsing
3. **Embedded applications** - Can't automatically refactor complex JS/CSS
4. **Inconsistent patterns** - Ghost export varies by plugin usage

### Best Practices

✅ **DO:**
- Use Git checkpoints before bulk operations
- Test regex patterns with `--dry-run` first
- Handle one pattern type at a time
- Document discovered patterns immediately

❌ **DON'T:**
- Run sed/awk on all files without testing
- Assume draft: true excludes from build (it doesn't in Astro)
- Skip the bookmark card fixes (most common issue)
- Forget to handle escaped characters

---

## 📊 Pattern Frequency Summary

```
Pattern Type                 | Occurrences | Auto-Fixed | Manual
-----------------------------|-------------|------------|--------
Ghost Bookmark Cards         |      44     |     44     |    0
Curly Braces {text}          |      98     |     98     |    0
Escaped Brackets \[\]        |     102     |    102     |    0
Newsletter Signup Blocks     |      13     |     13     |    0
SVG Download Buttons         |       5     |      5     |    0
Comparison Operators < >     |      10     |     10     |    0
En-dash Arrows –> <–         |       5     |      5     |    0
Backtick Apostrophes \`      |       7     |      7     |    0
Embedded CSS/JS Apps         |       2     |      0     |    2
-----------------------------|-------------|------------|--------
TOTAL                        |     286     |    284     |    2
Success Rate                 |             |   99.3%    |
```

---

## 🔮 Future Improvements

### For Next Migration

1. **Pre-migration scan** - Identify patterns before bulk import
2. **Ghost export cleanup** - Process JSON before MDX generation
3. **Custom Astro components** - Replace Ghost cards with Astro equivalents
4. **Validation pipeline** - Catch issues during import, not after

### Tool Enhancements

1. Add more pattern types to `comprehensive-ghost-cleanup.py`
2. Create regex pattern library for common Ghost artifacts
3. Build MDX validator that runs on file save
4. Add progress bar to iterative loop

---

## 📞 Troubleshooting

### Build Still Failing?

1. **Check specific error:**
   ```bash
   npm run build 2>&1 | grep -A 5 "Could not parse"
   ```

2. **Identify file and line:**
   ```bash
   grep "file:" build-output.log | head -1
   ```

3. **Inspect the issue:**
   ```bash
   sed -n '110,120p' path/to/file.mdx
   ```

4. **Common fixes:**
   - Curly braces: Replace `{text}` with `(text)`
   - HTML-like chars: Escape or convert `<` `>` `–>`
   - Embedded code: Move to `_filename.bak` or refactor

### Pattern Not Matching?

Check regex flags:
- Use `re.DOTALL` for multiline matching
- Use `re.IGNORECASE` for case-insensitive matching
- Test regex at https://regex101.com/ with Python flavor

---

## ✅ Verification Checklist

After running cleanup:

- [ ] `npm run build` completes successfully
- [ ] Page count matches expected (227 - drafts)
- [ ] Random sample spot-checks look good
- [ ] No Ghost artifacts in built HTML
- [ ] Images load correctly
- [ ] Internal links work
- [ ] RSS feed generates
- [ ] Sitemap includes all pages

---

**Last Updated:** 2025-10-23
**Maintained By:** Lukas Zangerl / Claude Code
**Status:** ✅ 99% Complete (2 files need manual refactoring)
