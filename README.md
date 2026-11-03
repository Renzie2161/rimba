<div align="center">

<img src="./public/readme-mark.png" alt="Rimba logo with rounded corners" width="200">

# Rimba

**An Indonesian-first biodiversity encyclopedia for learning about species and conservation.**

[![Next.js 16.4.4](https://img.shields.io/badge/Next.js-16.4.4-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19.3.0](https://img.shields.io/badge/React-19.3.0-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5.9.3](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4.3.4](https://img.shields.io/badge/Tailwind_CSS-4.3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![next-intl 4.14.9](https://img.shields.io/badge/next--intl-4.14.9-111827)](https://next-intl.dev/)
[![Supabase client scaffold](https://img.shields.io/badge/Supabase-client%20scaffold-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest 5.1.0](https://img.shields.io/badge/Vitest-5.1.0-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright 1.64.1](https://img.shields.io/badge/Playwright-1.64.1-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Node.js 20.9+](https://img.shields.io/badge/Node.js-20.9%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Cloudflare Pages planned and unverified](https://img.shields.io/badge/Cloudflare_Pages-planned%20%2F%20unverified-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)

</div>

---

## Contents

- [About Rimba](#about-rimba)
- [Project status](#project-status)
- [Planned product](#planned-product)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Development commands](#development-commands)
- [Architecture](#architecture)
- [Project layout](#project-layout)
- [Content and safety](#content-and-safety)
- [Contributing](#contributing)

## About Rimba

Rimba is a university prototype for UN Sustainable Development Goal 15: Life on Land.

The planned encyclopedia will help visitors find species, learn about conservation, and inspect sources for published claims.

## Project status

Phase 0 delivers a responsive Indonesian-first site foundation and development tooling.

The project has no species records, search, authentication, admin tools, live database reads, or conservation pages yet. Supabase credentials are not required for this phase.

English remains inactive until reviewed translations are ready.

## Planned product

- Find species by common name, scientific name, conservation status, habitat, or region.
- Read species profiles with taxonomy, sourced facts, conservation assessments, dates when available, and licensed media.
- Explore conservation campaigns with clear demo labels and source details.
- Curators and admins will manage sourced drafts, review, and publication.
- Use a QRIS demonstration that cannot accept money or report real payments.
- Try image-based identification for selected taxa in a later phase, with uncertainty shown.

## Technology

The app uses Next.js App Router, React, TypeScript, Tailwind CSS, and next-intl. Vitest and Playwright cover unit and browser behavior.

Rimba includes environment validation and a lazy, server-only anonymous Supabase client. No route uses it for live data or authentication.

Cloudflare Pages is a requested deployment target. No deployment is configured or tested.

## Getting started

Requirements: Node.js `>=20.9` and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The Phase 0 site runs without Supabase credentials.

## Development commands

| Command                | Purpose                                               |
| :--------------------- | :---------------------------------------------------- |
| `npm run dev`          | Start the local Next.js server                        |
| `npm run build`        | Create a production build                             |
| `npm run start`        | Serve the production build                            |
| `npm run lint`         | Run ESLint                                            |
| `npm run typecheck`    | Run TypeScript without emitting files                 |
| `npm run test`         | Run Vitest unit tests                                 |
| `npm run test:e2e`     | Run Playwright browser tests                          |
| `npm run format`       | Format application source and configuration files     |
| `npm run format:check` | Check application source and configuration formatting |

Install Chromium once before browser tests: `npx playwright install chromium`.

## Architecture

Next.js renders pages on the server by default. `next-intl` provides locale routing and message dictionaries.

Future public data access will use typed server-side queries to read published Supabase records under row-level security.

Species content will need source records, assessment context, and media license details before publication. Import and review flows are not implemented.

## Project layout

| Path            | Purpose                                                        |
| :-------------- | :------------------------------------------------------------- |
| `src/app/`      | Site routes, layouts, and loading, error, and not-found states |
| `src/i18n/`     | Locale routing and navigation                                  |
| `src/lib/`      | Environment validation and server-only Supabase client         |
| `src/messages/` | Locale message dictionaries                                    |
| `tests/unit/`   | Fast contract tests                                            |
| `tests/e2e/`    | Browser routing and interaction checks                         |
| `public/`       | Brand images, including the rounded README mark                |

## Content and safety

- Source every biodiversity claim. Keep unassessed or unknown conservation status explicit.
- Use media only when its taxon, license, alt text, and attribution are correct.
- Keep QRIS non-payable and local-only. Do not collect payer data or show real payment totals.
- Keep `.env.local` and working credentials out of commits. Use a separate development Supabase project.

## Contributing

Run formatting, lint, type checks, unit tests, and a production build before a change is complete. Run browser tests for route or interaction changes.

Include a short change summary and the exact checks you ran with each pull request.
