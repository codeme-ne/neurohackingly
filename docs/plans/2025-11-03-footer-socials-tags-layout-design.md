# Footer Socials & Tags Layout Redesign

**Date:** 2025-11-03
**Status:** Approved for Implementation
**Approach:** Shared Footer Component

## Overview

Refactor footer and tags page layout to:
1. Move social links from hero section to footer (site-wide)
2. Create minimalist footer matching existing design
3. Unify tags page layout with homepage (list instead of grid)

## Current State

### Social Links
- **Location:** Hero section on homepage only (index.astro:37-42)
- **Links:** X, LinkedIn, GitHub, RSS
- **Problem:** Not accessible from blog posts or tag pages

### Footer
- **Status:** Duplicated in 3 files (index.astro, BlogPost.astro, [tag].astro)
- **Content:** Only copyright text: `© 2025 Neurohackingly by Lukas Zangerl`
- **Problem:** Code duplication, no social links

### Tags Page Layout
- **Current:** Grid with cards (image + content)
- **Homepage:** 3-column list (Date | Title | Read Time) via PostListTable
- **Problem:** Inconsistent layouts across site

## Proposed Solution

### 1. Footer Component

**New file:** `src/components/Footer.astro`

**Structure:**
```
┌─────────────────────────────────┐
│                                 │
│  [X] [LinkedIn] [GitHub] [RSS]  │  ← Social links
│                                 │
│  © 2025 Neurohackingly by       │  ← Copyright
│  Lukas Zangerl                  │
│                                 │
└─────────────────────────────────┘
```

**Design Principles:**
- Minimalist: border-top like MinimalNav's border-bottom
- Centered: max-width 720px, padding 1.5rem (consistent with site)
- Typography: Same sizes as navigation (0.9rem social, 0.875rem copyright)
- Colors: `var(--color-text-light)` for socials, `var(--color-text)` for copyright
- Spacing: Vertical padding for visual separation, not dominant

**Responsive:**
- Mobile: Social links stay horizontal (4 links fit), slightly smaller gaps

### 2. Footer Integration

**Files to modify:**
1. **`src/pages/index.astro`**
   - Add import: `import Footer from '../components/Footer.astro';`
   - Replace: `<footer>...</footer>` → `<Footer />`
   - Remove: Social links section from hero (lines 37-42)

2. **`src/layouts/BlogPost.astro`**
   - Add import: `import Footer from '../components/Footer.astro';`
   - Replace: `<footer>...</footer>` → `<Footer />`

3. **`src/pages/blog/tag/[tag].astro`**
   - Add import: `import Footer from '../../../components/Footer.astro';`
   - Replace: `<footer>...</footer>` → `<Footer />`

**Benefits:**
- DRY: Footer code in single location
- Social links available site-wide
- Consistent design across all pages

### 3. Tags Page Layout

**File:** `src/pages/blog/tag/[tag].astro`

**Changes:**
- Add import: `import PostListTable from '../../../components/PostListTable.astro';`
- Remove: `.posts-grid` with card layout (lines 55-98)
- Replace with: `<PostListTable posts={filteredPosts} />`
- Remove: Associated grid/card styles

**Result:**
- Tags page uses same 3-column list as homepage
- Consistent layout: Date | Title | Read Time
- Same responsive behavior (mobile: stacked, tablet: 2-column)

## Success Criteria

- [ ] Footer component created with social links + copyright
- [ ] Footer matches MinimalNav design language (borders, spacing, typography)
- [ ] Social links removed from homepage hero
- [ ] Footer integrated in all 3 pages (index, BlogPost, [tag])
- [ ] Tags page uses PostListTable (same as homepage)
- [ ] No grid/card layout on tags page
- [ ] All pages build without errors
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Design remains minimalist and consistent

## Files Modified

1. `src/components/Footer.astro` (new)
2. `src/pages/index.astro`
3. `src/layouts/BlogPost.astro`
4. `src/pages/blog/tag/[tag].astro`

## Implementation Notes

- Use existing CSS variables for consistency
- Maintain accessibility (aria-labels for social links)
- Keep social link order: X, LinkedIn, GitHub, RSS
- No breaking changes to existing components
