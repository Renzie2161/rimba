<div align="center">

<img src="./public/readme-mark.png" alt="Rimba app icon" width="200">

# Rimba

**Explore Indonesia’s biodiversity. Learn about species and conservation.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](./LICENSE)
[![Next.js 16.4.4](https://img.shields.io/badge/Next.js-16.4.4-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19.3.0](https://img.shields.io/badge/React-19.3.0-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5.9.3](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase JS 2.118.0](https://img.shields.io/badge/Supabase_JS-2.118.0-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

</div>

## Table of contents

- [About](#about)
- [Features](#features)
- [Technology](#technology)
- [Getting started](#getting-started)
  - [Requirements](#requirements)
  - [Installation](#installation)
- [Development](#development)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [Special thanks](#special-thanks)
- [License](#license)

## About

Rimba is an Indonesian-language biodiversity encyclopedia supporting SDG 15: Life on Land. It brings species information, conservation context, and on-device image identification into one application.

## Features

- **Species encyclopedia:** browse published records with taxonomy, habitat, conservation information, and reference material.
- **Image identification:** upload or paste a photo for local plant or animal model predictions. Photos remain on your device.
- **Exploration journal:** browse illustrative observations with search, filtering, sorting, and shareable URL state.
- **Google accounts:** create and edit a private profile with Supabase authentication; the profile shows recent successful encyclopedia matches and species-detail views.
- **Field guide:** access educational material about biodiversity and conservation.

Identification candidates are suggestions, not confirmed identifications. Scores are uncalibrated; animal browser inference remains unverified. Only verified plant taxon mappings link to encyclopedia entries. Automatic identification mode is unavailable.

Journal observations are synthetic examples, not personal records or expert-verified sightings. The donation page is a non-payable demonstration.

## Technology

| Area                    | Technology                                                                  |
| ----------------------- | --------------------------------------------------------------------------- |
| Application             | Next.js App Router, React, TypeScript                                       |
| Styling                 | Tailwind CSS and CSS Modules                                                |
| Data and authentication | Supabase PostgreSQL, row-level security, Google OAuth                       |
| Validation              | Zod                                                                         |
| Localization            | next-intl; Indonesian enabled                                               |
| Local inference         | Pl@ntNet ResNet18 through ONNX Runtime; iNaturalist through TensorFlow Lite |
| Testing                 | Vitest, PostgreSQL checks, Playwright tooling                               |
| CI                      | GitHub Actions                                                              |

## Getting started

### Requirements

- Bun `1.4.4`
- Node.js `>=20.9`
- Git LFS
- A Supabase project with the repository’s migrations applied

### Installation

```bash
bun install --frozen-lockfile
git lfs pull
```

Create `.env.local` using `.env.example` as a reference:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
# Optional application origin for OAuth redirects and social metadata.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use the public anonymous or publishable key, never a service-role key, for browser-visible configuration. Keep local credentials out of Git.

For account features, enable Google in Supabase Auth, configure OAuth credentials in the provider settings, and allow the application’s `/auth/callback` URL. Disable other sign-in providers for the Google-only account flow.

```bash
bun run dev
```

Open [localhost:3000/id](http://localhost:3000/id).

## Development

| Command                                  | Purpose                                                       |
| ---------------------------------------- | ------------------------------------------------------------- |
| `bun run dev`                            | Start the development server                                  |
| `bun run build`                          | Build the production application and local inference runtimes |
| `bun run start`                          | Start the production server                                   |
| `bun run lint`                           | Run ESLint                                                    |
| `bun run typecheck`                      | Check TypeScript types                                        |
| `bun run test`                           | Run unit tests                                                |
| `bun run test:e2e`                       | Run browser tests                                             |
| `bun run test:db`                        | Run database checks in disposable local PostgreSQL            |
| `bun run ai:verify`                      | Validate pinned model assets                                  |
| `bun run seed:validate -- <drafts.json>` | Validate species drafts without database access               |
| `bun run seed:sql -- <drafts.json>`      | Generate seed SQL for review                                  |
| `bun run format:check`                   | Check source formatting                                       |
| `bun run format`                         | Format source and configuration                               |

Database checks require `initdb`, `pg_ctl`, and `psql` on `PATH`. They use a temporary local cluster, not the hosted database.

## Deployment

GitHub Actions runs lint, type checks, and unit tests. Pushes to `master` and manual runs also produce a standalone Node.js artifact; deployment is managed separately.

Configure these GitHub Actions repository variables for artifact builds:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

A Dockerfile is included for container builds. Supply the same public configuration as build arguments; `NEXT_PUBLIC_SITE_URL` is optional. Next.js embeds `NEXT_PUBLIC_*` values at build time. Use HTTPS for the deployed application.

## Project structure

| Path                           | Responsibility                                  |
| ------------------------------ | ----------------------------------------------- |
| `src/app/[locale]/`            | Application routes and page layouts             |
| `src/features/species/`        | Species catalog, validation, and queries        |
| `src/features/identification/` | Local model adapters and identification results |
| `src/features/journal/`        | Journal data and query contracts                |
| `src/features/account/`        | Account and profile features                    |
| `src/i18n/`, `src/messages/`   | Routing and translations                        |
| `supabase/migrations/`         | Database schema, policies, and RPCs             |
| `supabase/seeds/`              | Species and demonstration data                  |
| `tests/`, `supabase/tests/`    | Application and database tests                  |
| `public/`                      | Brand assets, images, and model assets          |

## Contributing

Keep contributions focused and run checks relevant to the change. Include reproduction steps for bugs and report any behavior that remains unverified.

Scientific claims require supporting references. Preserve media provenance and review third-party usage rights. Never commit credentials, fabricate observations, or present model predictions as verified species identifications.

## Special thanks

Thanks to **Group 9 INFINITY (Kelompok 9 INFINITY)** for contributing to Rimba.

## License

Rimba’s original code and documentation are licensed under [Apache License 2.0](./LICENSE). Copyright 2026 Renzie2161.

Third-party dependencies, model assets, biodiversity material, and media retain their respective licenses. The project license does not grant rights to reuse third-party content.
