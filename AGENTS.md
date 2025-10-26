# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/` contains route-driven `.astro` views plus serverless endpoints such as `src/pages/api/subscribe.ts`.
- Markdown content lives in `src/content/` (`blog/` for posts, `de/` for localized entries); shared building blocks sit in `src/components/`, layouts in `src/layouts/`, stylesheets in `src/styles/`, and helpers in `src/utils/`.
- Static assets stay in `public/` (served verbatim) while production builds are emitted to `dist/`.
- Internal automation scripts (`scripts/ghost-parser.ts`, `scripts/migrate-images.ts`) run with `tsx`; planning artifacts for agents live under `implement/` and `refactor/`.

## Build, Test, and Development Commands
```sh
npm install            # install dependencies (Node 22.x required)
npm run dev            # start Astro dev server on http://localhost:4321
npm run build          # create the optimized site in dist/
npm run preview        # serve the last build for acceptance testing
npm run astro check    # type-check content collections and Astro components
npm run lint:content    # lint frontmatter/metadata for required fields and slug conflicts
npm run parse-ghost    # import Ghost exports via scripts/ghost-parser.ts
npm run migrate-images # normalize remote image references into /public/images
```
Always run `npm run build` before submitting a PR; pair it with `npm run preview` for localized or layout checks.

## Metadata & SEO Guidelines
- Use `src/components/SEO.astro` for all routes/layouts; it now supports `category`, `canonical`, `noindex`, `authorSocials`, and `structuredData` props. Pass category hints (`home`, `blog`, `newsletter`, `learning`, `tools`) so the right OG/Twitter fallback art is injected from `public/images/og/`.
- When adding JSON-LD, supply the schema via the `structuredData` prop rather than inlining `<script>` tags. Author handles (Twitter, LinkedIn, GitHub, website) can be passed through `authorSocials` for both meta tags and schema `sameAs` references.
- Blog content frontmatter is enriched with `topics` (string array) and optional numeric `readingTime` (minutes). Populate them so layouts can surface richer JSON-LD (`keywords`, `about`, `timeRequired`) and downstream linting stays quiet.
- Localized routes under `/de` automatically emit `hreflang` alternates and `og:locale`; ensure the matching English route exists or provide a deliberate `canonical` override when that is not true.
- Wire `npm run lint:content` into pre-push or CI jobs so duplicate slugs and metadata regressions are caught before deployment.

## Coding Style & Naming Conventions
- Use 2-space indentation and Prettier-style wrapping; keep `.astro`, `.ts`, and `.mdx` files formatted consistently.
- Components and layouts use `PascalCase` filenames (`HeroSection.astro`); page routes remain `kebab-case` (`blog/index.astro`, `de/index.astro`).
- Prefer typed imports/exports in utilities, strongly typed frontmatter (`defineCollection`) for content, and descriptive asset names (`images/hero-launch.jpg`).

## Testing Guidelines
- There is no dedicated unit-test suite yet; treat `npm run build` as the smoke test and address warnings produced by `astro check` immediately.
- When adding dynamic features, document manual QA steps in the PR and, if practical, add regression helpers (e.g., validation scripts) under `scripts/`.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes found in history (`feat:`, `fix:`, `chore:`) and write imperative summaries under 72 characters.
- Open PRs with a crisp synopsis, list of notable files, and linked issues or todo references; attach before/after screenshots for visual changes.
- Confirm environment variables in `.env.local` are documented when introducing new secrets and never commit secret values.

## Environment & Security Notes
- Astro runs in `output: 'hybrid'`; serverless routes such as `/api/subscribe` depend on `KIT_API_SECRET`/`KIT_API_KEY` and `KIT_FORM_ID` configured via `.env.local`.
Mirror local secret names inside Vercel project settings and scrub temporary logs before pushing.
