# Blog Automation Pipeline Design

**Date**: 2025-10-28
**Author**: Lukas Zangerl
**Status**: Design Approved

## Executive Summary

Human-in-the-loop automation pipeline for creating blog posts with AI assistance. The system automates frontmatter generation, image optimization, and topic suggestions while preserving authentic human voice in content.

**Success Criteria**:
- 50%+ time savings (setup to publish)
- Consistent frontmatter and image quality
- Low maintenance, reliable operation

## Requirements

### What Gets Automated
- Topic/outline suggestions based on writing style
- Image optimization and organization
- Frontmatter generation (tags, descriptions, dates)

### What Stays Manual
- Content writing (user writes all text)
- Editorial decisions and voice

### User Experience
- Web dashboard at `/admin` route
- Inline editing for all AI suggestions
- Drag-and-drop image uploads
- Preview before publish

## Architecture

### Tech Stack
- **Frontend**: Astro pages + React islands for admin UI
- **Backend**: Astro API routes (`/api/*`)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password or magic links)
- **AI**: OpenRouter API (default: `anthropic/claude-3.5-haiku`)
- **Image Processing**: Sharp library
- **Deployment**: Vercel (existing)

### Directory Structure
```
/src
  /pages
    /admin
      index.astro          # Dashboard
      /drafts
        [id].astro         # Draft editor
  /api
    /auth
      login.ts
      logout.ts
    /drafts
      create.ts
      update.ts
      publish.ts
    /ai
      analyze-style.ts     # Style fingerprint
      suggest.ts           # Generate suggestions
    /images
      upload.ts
      optimize.ts
  /content
    /blog                  # Published posts (existing)
  /drafts                  # Draft storage (new)
/public
  /images                  # Optimized images

/docs
  /plans                   # Design documents
```

### Database Schema (Supabase)

**Table: `drafts`**
```sql
id              UUID PRIMARY KEY
slug            TEXT UNIQUE
title           TEXT NOT NULL
content         TEXT
status          TEXT CHECK (status IN ('new', 'in-progress', 'ready', 'published'))
ai_suggestions  JSONB
user_id         UUID REFERENCES auth.users
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**Table: `style_cache`**
```sql
id              UUID PRIMARY KEY
topic_clusters  JSONB
tag_patterns    JSONB
title_templates JSONB
analyzed_at     TIMESTAMP
```

**Table: `usage_logs`**
```sql
id              UUID PRIMARY KEY
date            DATE
tokens_used     INTEGER
cost_estimate   DECIMAL(10,2)
model_used      TEXT
```

## Core Components

### 1. Draft Editor
**Route**: `/admin/drafts/[id]`

**Features**:
- Rich text markdown editor (TipTap)
- Live markdown preview
- Drag-and-drop image upload zone
- AI suggestion panel (side-by-side):
  - Topic ideas (5 suggestions)
  - Tag suggestions (5-8 tags)
  - SEO description
  - Hero image alt text
- Auto-save every 30 seconds
- Status badges (new, in-progress, ready)

**UI Layout**:
```
┌─────────────────────────────────────────┐
│ [← Back] Draft: "How to Learn Faster"  │
├─────────────────────────────────────────┤
│ Editor Pane        │  AI Suggestions    │
│                    │  ┌──────────────┐  │
│ # Title            │  │ Topics       │  │
│                    │  │ • Spaced rep │  │
│ Content here...    │  │ • Active rec │  │
│                    │  │ [Regenerate] │  │
│ [Image Drop Zone]  │  ├──────────────┤  │
│                    │  │ Tags         │  │
│                    │  │ ☑ learning   │  │
│                    │  │ ☑ studying   │  │
│                    │  │ [Edit]       │  │
│                    │  └──────────────┘  │
├─────────────────────────────────────────┤
│ [Preview] [Save] [Publish]              │
└─────────────────────────────────────────┘
```

### 2. Style Analyzer
**Route**: `/api/ai/analyze-style`

**Process**:
1. Scans all files in `src/content/blog/*.mdx`
2. Extracts patterns:
   - Title formats (e.g., "X Ways to...", "How to...")
   - Top 20 most-used tags
   - Description length/style
   - Topic categories (productivity, learning, health)
3. Creates embeddings for topic clustering
4. Stores in `style_cache` table
5. Cache TTL: 30 days (re-run on-demand)

**Performance**: ~30 seconds for 100+ posts

### 3. Image Pipeline
**Route**: `/api/images/upload`

**Workflow**:
```
Upload → Validate → Optimize → Store → Reference
```

**Steps**:
1. Accept JPEG/PNG/WebP (max 10MB)
2. Generate sizes:
   - `thumbnail`: 300x200px
   - `medium`: 800x600px
   - `full`: 1920x1080px
3. Optimize with Sharp:
   - Quality: 85%
   - Progressive JPEG
   - WebP conversion
4. Store in `/public/images/[slug]/`
5. Return URLs for frontmatter

**Output**:
```
/public/images/how-to-learn-faster/
  original.jpg
  thumbnail.webp
  medium.webp
  full.webp
```

### 4. Draft Manager
**Route**: `/admin`

**Features**:
- List all drafts (table view)
- Filter by status
- Search by title
- Quick actions: edit, delete, duplicate
- Batch operations
- Usage statistics (tokens, costs)

## AI Integration

### OpenRouter Configuration

**Environment Variables**:
```env
OPENROUTER_API_KEY=sk-...
OPENROUTER_MODEL=anthropic/claude-3.5-haiku
OPENROUTER_FALLBACK=openai/gpt-3.5-turbo
```

**Config File**: `src/lib/ai-config.ts`
```typescript
{
  provider: 'openrouter',
  model: 'anthropic/claude-3.5-haiku',
  fallbackModel: 'openai/gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  timeout: 30000
}
```

### Style Analysis (Phase A)

**Trigger**: On-demand via admin UI button

**Process**:
1. Read all MDX files from `src/content/blog/`
2. Extract frontmatter + content
3. Send to LLM:
   ```
   System: "Analyze this author's writing style across 100+ posts"
   User: [JSON array of posts with title, tags, description]
   ```
4. LLM returns:
   ```json
   {
     "topic_clusters": ["productivity", "learning", "health"],
     "tag_patterns": ["studying", "activerecall", "productivity"],
     "title_templates": ["X Ways to...", "How to..."],
     "description_style": "action-oriented, concise"
   }
   ```
5. Cache in Supabase `style_cache`

**Cost**: ~$0.10 per analysis (100+ posts)

### Suggestion Generation (Phase B)

**Trigger**: User clicks "Get AI Suggestions" in draft editor

**API Route**: `POST /api/ai/suggest`

**Input**:
```json
{
  "draftId": "uuid",
  "title": "How to Learn Faster",
  "partialContent": "Learning is a skill..."
}
```

**Process**:
1. Fetch cached style analysis from Supabase
2. Send to OpenRouter:
   ```
   System: "You are a content strategist matching this style: [cached data]"
   User: "Generate suggestions for: [draft title + content]"
   ```
3. LLM returns:
   ```json
   {
     "topics": [
       "5 Science-Backed Methods to Double Your Learning Speed",
       "Active Recall: The Study Technique That Actually Works"
     ],
     "tags": ["learning", "studying", "activerecall", "productivity", "metalearning"],
     "description": "Discover evidence-based techniques to accelerate your learning using active recall and spaced repetition.",
     "heroAltText": "Student using active recall study method with flashcards"
   }
   ```
4. Store in `drafts.ai_suggestions` column
5. Return to frontend

**Cost**: ~$0.01-0.02 per suggestion

### Error Handling

**Retry Logic**:
- 2 retries with exponential backoff (1s, 2s)
- Timeout: 30 seconds

**Fallbacks**:
1. Try primary model (Claude Haiku)
2. Try fallback model (GPT-3.5)
3. Show cached suggestions (if available)
4. Show manual fallback UI

**Rate Limiting**:
- 10 requests/minute per user
- Monthly cost cap: $10 (configurable)
- Dashboard shows usage: "Used $2.40 / $10.00"

**User-Facing Errors**:
- "AI temporarily unavailable, try again in a moment"
- "Monthly usage limit reached, suggestions paused"
- Never expose API keys or technical details

## Publishing Workflow

**Process** (when user clicks "Publish"):

1. **Markdown Linting**
   - Run `markdownlint` on content
   - Check: no broken links, proper heading hierarchy
   - Block publish if critical errors

2. **Validation**
   - Required fields: title, description, pubDate, tags, image
   - Slug uniqueness check
   - Image file existence check

3. **Slug Generation**
   - Convert title to URL-safe slug
   - Example: "How to Learn Faster" → "how-to-learn-faster"
   - Check for duplicates, append `-2` if needed

4. **File Creation**
   - Write to `src/content/blog/[slug].mdx`
   - Format frontmatter:
     ```yaml
     ---
     title: "How to Learn Faster"
     description: "Evidence-based techniques..."
     pubDate: 2025-10-28T10:00:00.000Z
     author: Lukas Zangerl
     tags: [learning, studying, activerecall]
     featured: false
     draft: false
     hero: ../../assets/heroes/how-to-learn-faster/full.webp
     ---
     ```

5. **Git Commit**
   - Stage file: `git add src/content/blog/[slug].mdx`
   - Commit: `git commit -m "Published: How to Learn Faster"`
   - Push: `git push origin master`

6. **Vercel Webhook**
   - POST to `https://api.vercel.com/v1/integrations/deploy/[hook-id]`
   - Triggers production rebuild (~2 mins)
   - Show toast: "Published! Site rebuilding..."

7. **Draft Archival**
   - Update `drafts.status` to "published"
   - Keep draft in DB for history

**Rollback** (Unpublish):
- Delete MDX file from `src/content/blog/`
- Revert draft status to "ready"
- Keep images (manual cleanup if needed)
- Available for 24 hours after publish

## Security

### Authentication (Supabase)
- Email/password or magic link login
- Session cookies (httpOnly, secure, sameSite)
- Row Level Security (RLS) policies:
  ```sql
  CREATE POLICY "Users can only access own drafts"
  ON drafts FOR ALL
  USING (auth.uid() = user_id);
  ```

### API Security
- All `/api/*` routes require authentication
- CSRF protection via Supabase
- Rate limiting: 100 requests/hour per IP
- Input validation with Zod schemas

### File Upload Security
- Max size: 10MB
- Allowed types: JPEG, PNG, WebP only
- Filename sanitization (remove `../`, special chars)
- MIME type validation (not just extension)
- Virus scanning (optional, via ClamAV)

### Environment Variables
```env
# Never commit these!
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
OPENROUTER_API_KEY=sk-...
VERCEL_DEPLOY_HOOK=https://api.vercel.com/...
ADMIN_EMAIL=lukas@...
```

### Content Security
- Markdown linting catches XSS attempts
- Sanitize HTML in preview mode
- No inline scripts allowed in content
- CSP headers on admin routes

## Cost Estimates

### Monthly Operating Costs

**AI Usage** (assuming 20 drafts/month):
- Style analysis: 1x/month × $0.10 = $0.10
- Suggestions: 20 × $0.02 = $0.40
- **Total AI**: ~$0.50/month

**Supabase** (Free tier):
- Database: Included (500MB)
- Auth: Included (50k users)
- Storage: $0 (using Vercel for images)

**Vercel**:
- Hosting: Free (Hobby plan)
- Bandwidth: Included (100GB)

**Total Monthly Cost**: ~$0.50

### Time Savings Estimate

**Current workflow** (per post):
- Write content: 60 min
- Find/optimize images: 15 min
- Write frontmatter: 10 min
- Deploy/verify: 5 min
- **Total**: 90 min

**With automation** (per post):
- Write content: 60 min (unchanged)
- Upload images: 2 min (drag-drop)
- Accept AI suggestions: 3 min (review/edit)
- Publish: 1 min (one click)
- **Total**: 66 min

**Savings**: 24 min/post (27% time reduction)

For 8 posts/month: **192 min saved (3.2 hours)**

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up Supabase project
- Create database schema
- Implement auth (login/logout)
- Basic admin layout

### Phase 2: Draft Management (Week 2)
- Draft CRUD operations
- List/filter/search UI
- Auto-save functionality
- SQLite → Supabase migration

### Phase 3: Image Pipeline (Week 2)
- Upload API route
- Sharp optimization
- Multiple size generation
- Storage organization

### Phase 4: AI Integration (Week 3)
- OpenRouter client setup
- Style analyzer implementation
- Suggestion generation API
- Inline editing UI

### Phase 5: Publishing (Week 3)
- Markdown linting
- File generation
- Git automation
- Vercel webhook

### Phase 6: Polish (Week 4)
- Error handling
- Loading states
- Usage tracking
- Documentation

## Future Enhancements (Not in V1)

- **Multi-user support**: Team collaboration with roles
- **Content calendar**: Schedule posts in advance
- **Analytics integration**: View post performance
- **SEO scoring**: Real-time SEO recommendations
- **Version history**: Track draft changes over time
- **Template library**: Reusable post structures
- **Bulk operations**: Publish multiple drafts at once

## Open Questions

None (design approved).

## References

- [Astro Docs](https://docs.astro.build)
- [Supabase Docs](https://supabase.com/docs)
- [OpenRouter API](https://openrouter.ai/docs)
- [Sharp Documentation](https://sharp.pixelplumbing.com)
- [Markdownlint Rules](https://github.com/DavidAnson/markdownlint)
