# Refactoring Plan - Code Review Fixes
**Session Created:** 2025-10-25T09:40:00Z
**Scope:** Fix critical and high-priority issues from code review

## Initial State Analysis

### Current Architecture
- Astro 5 static blog with server-side newsletter API
- Ghost CMS migration scripts (one-off utilities)
- Vercel serverless deployment
- MDX content with dual language support (English + German)

### Problem Areas Identified
1. **Configuration Mismatch**: `output: 'server'` vs documented static site
2. **Missing Assets**: Default OG image doesn't exist
3. **Ineffective Security**: In-memory rate limiting resets on cold starts
4. **Information Leakage**: Console statements in production API
5. **XSS Vulnerability**: Unsanitized HTML in Ghost parser
6. **Environment Inconsistency**: Node 24 local vs Node 22 Vercel

### Dependencies
- External: ConvertKit API, Vercel platform
- Internal: Astro collections, MDX processing, Turndown

### Test Coverage
- No automated tests detected
- Manual testing required after changes

---

## Refactoring Tasks

### CRITICAL Priority (Fix Immediately)

#### Task 1: Fix Output Mode Configuration ✅
**Risk:** Low
**Files:** `astro.config.mjs`
**Change:** `output: 'server'` → `output: 'static'`
**Validation:** Build succeeds, no serverless functions generated
**Status:** Pending

#### Task 2: Add Default OG Image
**Risk:** Low
**Files:** Create `public/og-image.jpg` OR update `src/components/SEO.astro`
**Change:** Either create 1200×630px image or point to existing asset
**Validation:** Social share preview works
**Status:** Pending

### HIGH Priority

#### Task 3: Remove Production Console Statements
**Risk:** Low
**Files:** `src/pages/api/subscribe.ts`
**Lines:** 52, 68, 75, 80, 119, 122
**Change:** Remove or replace with structured logging
**Validation:** API still functions, no console output
**Status:** Pending

#### Task 4: Add Node Version Constraint
**Risk:** Low
**Files:** `package.json`
**Change:** Add `"engines": { "node": ">=22.0.0 <24.0.0" }`
**Validation:** Build shows version warning if mismatch
**Status:** Pending

#### Task 5: Document Rate Limiting Limitation
**Risk:** Low (documentation only for now)
**Files:** `README.md` or inline comment
**Change:** Note that rate limiting resets on cold starts
**Future:** Consider Vercel KV/Upstash for persistent storage
**Status:** Pending

#### Task 6: Add Ghost Parser Input Validation
**Risk:** Medium
**Files:** `scripts/ghost-parser.ts`
**Change:** Validate JSON structure before processing
**Validation:** Script handles malformed input gracefully
**Status:** Pending

### MEDIUM Priority

#### Task 7: Extract Magic Number Constant
**Risk:** Low
**Files:** `src/layouts/BlogPost.astro`
**Change:** Extract `200` to `WORDS_PER_MINUTE` constant
**Validation:** Reading time calculation unchanged
**Status:** Pending

#### Task 8: Clean Up Dead German Routes
**Risk:** Low
**Files:** `src/content/config.ts`, `src/content/de/`
**Options:**
  A. Remove `de` collection entirely
  B. Add `.gitkeep` and document future use
**Validation:** Build warning resolved
**Status:** Pending (needs user choice)

### LOW Priority

#### Task 9: Archive Migration Scripts
**Risk:** Low
**Files:** Move to `scripts/archive/`
**Scripts:** All one-off migration utilities
**Validation:** `npm run` scripts still work for active ones
**Status:** Pending

---

## Execution Order

1. **Quick wins first** (Tasks 1, 4, 7) - 5 min
2. **Production fixes** (Tasks 3, 6) - 10 min
3. **Decision-based** (Tasks 2, 5, 8) - Ask user preferences
4. **Cleanup** (Task 9) - 5 min

---

## Validation Checklist

After all changes:
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No console warnings (except known ones)
- [ ] API endpoint still functional
- [ ] Social share preview works
- [ ] Git diff shows only intended changes
- [ ] All changes committed with clear messages

---

## De-Para Mapping

| Before | After | Status |
|--------|-------|--------|
| `output: 'server'` | `output: 'static'` | Pending |
| Console statements in API | Removed/structured logging | Pending |
| Magic number `200` | `WORDS_PER_MINUTE` constant | Pending |
| Missing OG image | Created/redirected asset | Pending |
| No Node version constraint | `engines` field added | Pending |
| Unvalidated Ghost JSON | Zod schema validation | Pending |
| `de` collection (unused) | Removed or documented | Pending |
| Migration scripts in root | Moved to `scripts/archive/` | Pending |

---

## Notes

- **XSS sanitization (Task 5):** Ghost parser is a one-off migration script. Since migration is complete, sanitization is lower priority. Documenting risk is sufficient.
- **Rate limiting:** Serverless limitation documented. Future improvement noted for persistent storage.
- **Testing strategy:** Manual verification due to lack of automated tests. Consider adding tests in future refactor.
