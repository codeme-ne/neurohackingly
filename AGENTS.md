# Repository Guidelines

This file is for all contributors (humans and agents) working in this repository.

## Project Structure & Module Organization

- `src/pages/` — Astro routes (e.g. `index.astro`, `blog/index.astro`, `[slug].astro`).
- `src/components/` — reusable UI components; keep them small and composable.
- `src/layouts/` — shared page layouts; prefer one layout per major page family.
- `src/content/` — content collections and config; update `src/content/config.ts` when adding types.
- `src/styles/` — global and shared styles; keep page-specific styles close to pages when possible.
- `src/utils/` — pure helpers; avoid importing Astro components here.
- `public/` — static assets served as-is.
- `docs/` — long-form documentation and plans.
- `scripts/` — TypeScript maintenance utilities run with `tsx`.

## Build, Test, and Development Commands

- `npm install` — install dependencies (requires Node `>=22 <24`).
- `npm run dev` — start Astro dev server.
- `npm run dev:with-search` — build search index and start dev with Pagefind.
- `npm run build` — production build to `dist/`.
- `npm run build:search` — build site and Pagefind index.
- `npm run preview` — preview production build locally.
- `npm run validate:home-links` — sanity-check homepage links.
- `npm run audit:migration` / `npm run fix:internal-links` — support URL and content migrations.

There is no dedicated test runner yet; treat `npm run build` and the validation scripts as required checks before merging.

## Coding Style & Naming Conventions

- Use TypeScript with the strict Astro config (`tsconfig.json`); prefer explicit types for public APIs.
- Prefer 2-space indentation and trailing commas where idiomatic.
- Components and layouts: `PascalCase` filenames (e.g. `Footer.astro`).
- Functions, variables, and helpers: `camelCase`.
- Route files follow Astro conventions (e.g. `tag/[tag].astro`, `[slug].astro`).

## Testing & Validation Guidelines

- Before opening a PR, run at least: `npm run build`, `npm run validate:home-links`, and `npm run audit:migration` if URLs changed.
- When adding new utilities in `src/utils/`, keep functions pure and easily testable; if you introduce a test framework (e.g. Vitest), keep it minimal and discuss in the PR.

## Commit & Pull Request Guidelines

- Use conventional-style prefixes where possible: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Keep commits focused and descriptive (what and why, not just how).
- PRs should include: a clear summary, linked issues (if any), and screenshots or GIFs for visible UI changes.
- Ensure all build and validation commands pass before requesting review.

## Security & Configuration Tips

- Copy `.env.example` to `.env.local` for local development; never commit `.env.local` or real secrets.
- In production, configure environment variables via Vercel project settings; keep secrets out of the repo and docs.
- Be careful when changing `vercel.json` redirects or routes; preserve existing URLs where possible and rerun migration/validation scripts after changes.

## Agent-Specific Instructions

- Always read this `AGENTS.md` (and any nested `AGENTS.md` files) before modifying files.
- Prefer the smallest change that solves the problem; match existing patterns in nearby code.
- Do not introduce new tools or frameworks without a clear reason and prior discussion in the PR description.
