<div align="center">

<img src="./public/favicon.png" alt="Rimba biodiversity logo" width="180">

# Rimba

**Indonesian-first biodiversity encyclopedia prototype for source-grounded species learning.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4.4-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.9-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

</div>

---

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Project layout](#project-layout)
- [Architecture](#architecture)
- [Supabase development](#supabase-development)
- [Contributing](#contributing)
- [Security & safety](#security--safety)

---

## Features

- Indonesian home at `/id`; `/` redirects to `/id`. English routes are deferred.
- Locale menu lists Bahasa Indonesia only; `en.json` stays dormant for future integration.
- Hanken Grotesk typography, navbar logo, and accessible light/dark theme toggle.
- Server-rendered foundation for reviewed, source-grounded species entries.
- No species records, search, accounts, live Supabase reads, or payment collection in Phase 0.

## Requirements

| Dependency | Version               |
| :--------- | :-------------------- |
| Node.js    | `>=20.9`              |
| npm        | Included with Node.js |

Supabase credentials are not required to run the Phase 0 home page.

## Getting started

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The root route opens `/id`; English UI is not enabled.

## Scripts

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

## Project layout

```text
src/
├── app/
│   ├── [locale]/(home)/       Indonesian home and loading state
│   ├── [locale]/[...slug]/    Unknown-route handling
│   ├── [locale]/site-controls.tsx  Language and theme controls
│   ├── globals.css            Light/dark tokens and responsive styles
│   └── favicon.ico            Rounded browser favicon
├── i18n/                      Locale routing and navigation
├── lib/supabase/              Lazy server-only client
├── messages/                  Indonesian active; English dormant
└── proxy.ts                   Locale routing
public/
└── favicon.png                Logo used in this README
tests/
├── e2e/                       Browser tests
└── unit/                      Unit tests
```

## Architecture

`src/proxy.ts` uses `next-intl` to route `/id` and send `/` to `/id`. Only Indonesian messages load
at runtime; `en.json` remains dormant for future integration. Pages use Server Components by default.

The Supabase client validates environment values when first used. The Phase 0 home does not call it.
There is no authentication, database query, or write flow yet.

## Supabase development

For future database work, copy `.env.example` to `.env.local` and use credentials from the dedicated
development project. Keep production credentials out of local development. Never put a service-role
key in browser code.

## Contributing

Keep changes focused. Include a short summary and the exact checks you ran with each pull request.
Run browser tests when you change routes or interactive behavior.

## Security & safety

- Never commit credentials or real `.env.local` values.
- QRIS, when implemented, remains a non-payable local simulation.
- `AGENTS.md`, `PRODUCT.md`, and `.private/` stay local through `.git/info/exclude`; fresh clones do
  not contain these private project notes.
