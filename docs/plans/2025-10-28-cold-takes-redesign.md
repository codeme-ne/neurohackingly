# Cold Takes-Inspired Homepage Redesign

**Date:** 2025-10-28
**Status:** Design Approved
**Reference:** https://www.cold-takes.com/

## Overview

Complete homepage redesign inspired by Cold Takes blog - minimal, typography-focused layout with chronological post listing. Scope includes homepage, navigation, and page structure updates.

## Design Goals

- Clean, readable, typography-first design
- Simple chronological post list (no featured posts section)
- Responsive layout across all screen sizes
- Preserve existing subscribe functionality
- Minimal, distraction-free reading experience

## Component Architecture

### New Components

**MinimalNav.astro**
- Simple header with logo + navigation links
- Logo/site name: "Neurohackingly" (links to `/`)
- Nav items: "Now" (`/now`) | "Newsletter" (`/newsletter`)
- Clean horizontal layout, right-aligned nav items
- Fixed or static positioning with subtle border-bottom

**PostListTable.astro**
- Chronological table-style post list
- Three columns: Date (MMM DD) | Post Title (linked) | Read time
- Subtle borders/dividers between rows
- Hover effect on title links
- Responsive card layout on mobile

### Modified Files

**src/pages/index.astro**
- Remove hero-media (video section)
- Simplify to centered layout:
  - Site title (large serif)
  - Tagline underneath
  - Social icons (Twitter/X, LinkedIn, GitHub, RSS)
  - Subscribe form (keep existing functionality)
  - Post list table below
- Strip complex hero-split styles
- Add centered content column (max-width ~720px)

### Page Migrations

- Move `src/pages/blog/now.astro` → `src/pages/now.astro`
- Update any internal links from `/blog/now` → `/now`
- Keep `/newsletter` as-is (already at root level)

## Visual Design

### Typography
- Headings: Existing `--font-serif`
- Body text: Sans-serif
- Hero title: Large (3.5-4rem desktop, scaled down mobile)
- Tagline: Medium serif (1.5-2rem)
- Post titles: Medium weight, readable size

### Color Palette
- Primary text: Black on white
- Metadata (dates, read times): Subtle gray
- Hover states: Existing `--color-accent`
- Subscribe button: Accent color
- Borders: Light gray dividers

### Layout
- Centered content column: max-width 720px
- Generous whitespace and line-height
- Minimal borders and dividers
- No drop shadows or heavy visual effects

### Social Icons
- Position: Below tagline, above subscribe form
- Horizontal row, centered
- Icons: Twitter/X, LinkedIn, GitHub, RSS
- Style: Simple text links or small SVG icons
- Subtle, non-competing with main content

## Responsive Design

### Mobile (<640px)
- Nav: Simple stacked links (no hamburger menu needed)
- Post table: Stack into cards
  - Date on top
  - Title as heading
  - Read time below
- Hero: Reduced font sizes (2.25-2.75rem)
- Subscribe form: Full-width input and button, stacked vertically

### Tablet (640px-900px)
- Nav: Horizontal links visible
- Post table: Simplified 2-column layout (date+title | read time)
- Hero: Medium font sizes (3-3.5rem)

### Desktop (>900px)
- Full 3-column post table layout
- Optimal reading width (720px content column)
- Larger typography (3.5-4rem hero)

### Touch Targets
- All clickable elements: min 44×44px
- Adequate spacing between interactive elements
- Clear hover/focus states

## Data Handling

### Post Collection
```javascript
const allPosts = await getCollection('blog', ({ data }) => !data.draft);
const sortedPosts = allPosts.sort((a, b) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
);
```

### Required Fields
- `title` - Post title
- `pubDate` - Publication date
- `id` - Post slug
- `body` - Post content (for reading time calculation)
- `description` - For meta/hover (optional)

### Reading Time Calculation
- Calculate on the fly at build time
- Word count / 200 wpm, rounded up
- Formula: `Math.ceil(post.body.split(/\s+/).length / 200)`
- Display format: "5 min read"

### Date Formatting
- Display format: "Oct 28" or "Jan 05"
- Use Intl.DateTimeFormat:
  ```javascript
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit'
  }).format(date)
  ```

## CSS Strategy

### Approach
- Keep `global.css` for base styles and CSS custom properties
- Component-scoped styles in each `.astro` file
- Leverage existing color/font variables
- Minimal new CSS, reuse where possible

### Key Style Rules
- Center content: `max-width: 720px; margin: 0 auto; padding: 0 1.5rem;`
- Typography scale: Use existing font variables
- Table/list styling: Clean borders, adequate padding
- Responsive: Mobile-first media queries

## Implementation Approach

**Strategy:** Component-focused rebuild

1. Create new specialized components (PostListTable, MinimalNav)
2. Keep existing styles where they work
3. Preserve working subscribe form functionality
4. Moderate effort, clean result
5. Components are reusable for future pages

## Migration Checklist

- [ ] Create `MinimalNav.astro`
- [ ] Create `PostListTable.astro`
- [ ] Update `index.astro` (simplify hero, add post list)
- [ ] Move `/blog/now.astro` → `/now.astro`
- [ ] Update navigation links in all pages
- [ ] Test subscribe form still works
- [ ] Verify RSS feed at `/rss.xml`
- [ ] Test responsive layouts (mobile, tablet, desktop)
- [ ] Verify all posts display correctly in list
- [ ] Check reading time calculations
- [ ] Test all navigation links work

## Out of Scope (Future Enhancements)

- Search functionality
- Featured posts section
- Post categories/tags in list view
- Dark mode toggle
- Pagination (show all posts for now)

## Success Criteria

- Homepage matches Cold Takes aesthetic: minimal, readable, typography-focused
- All posts display in chronological order with accurate dates and reading times
- Subscribe form works as before
- Fully responsive across all device sizes
- Navigation links work correctly (/now, /newsletter)
- Build completes without errors
- All existing functionality preserved
