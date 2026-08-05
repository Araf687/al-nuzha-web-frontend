# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # start dev server (localhost:3000)
pnpm build      # production build
pnpm lint       # ESLint via next lint
```

No test suite is configured.

## Environment

Copy `.env.local.example` to `.env.local` before running:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<key>   # required by TechnicianMap
```

Firebase config must be provided in `lib/firebase.ts` (not yet committed) — `TechnicianMap` imports `db` from there.

## Architecture

**Stack**: Next.js 16 App Router · React 19 · TypeScript 5 · pnpm · Tailwind v4 (PostCSS) · lucide-react icons · framer-motion (installed, not yet used).

**Route layout**:

| Path | Purpose |
|---|---|
| `/` | Public marketing landing page |
| `/customer` | Services catalogue |
| `/request` | 3-step booking form |
| `/dashboard` | Customer order tracking |
| `/admin` | Admin panel (own layout + sidebar) |
| `/admin/jobs`, `/admin/customers`, `/admin/staff`, `/admin/inventory`, `/admin/invoices` | Admin sub-pages |

The `/admin` segment uses `app/admin/layout.tsx` which wraps every page with `AdminSidebar`.

**Component directories**:

- `app/components/` — shared UI: `Navbar`, `AdminSidebar`, `Badge`
- `components/` — feature components: `TechnicianMap.jsx` (Google Maps + Firebase live location)

**API client** (`lib/api.ts`): `apiFetch<T>(path, options?, token?)` wraps `fetch` against `NEXT_PUBLIC_API_URL`. The `api` object exports named calls (loginCustomer, registerCustomer, createRequest, myOrders, myInvoices, etc.). Pass a Bearer token as the third argument for authenticated routes.

## Styling conventions

- **Inline styles are the dominant pattern** — most components use `style={{}}` props, not Tailwind classes.
- Tailwind v4 is imported in `globals.css` (`@import "tailwindcss"`) but used sparingly.
- CSS variables defined in `globals.css` `:root` must be used for brand colors rather than raw hex:

| Var | Value | Use |
|---|---|---|
| `--brand` | `#0a4a35` | dark brand |
| `--brand-mid` | `#0f6e56` | primary brand |
| `--brand-light` | `#1a9e75` | lighter brand |
| `--brand-pale` | `#e8f5f0` | tinted background |
| `--brand-dark` | `#062b1f` | footer / dark bg |
| `--accent` | `#e8a045` | amber CTA highlight |
| `--text-1/2/3` | `#0f1a15` / `#3d5a4e` / `#7a9b8e` | text hierarchy |
| `--border` | `#d4e8e0` | card/input borders |
| `--surface` | `#f5faf8` | page surface tint |

- **Fonts**: `--font-display` (Fraunces, serif) for all headings; `--font-body` (Plus Jakarta Sans) for body/UI. Reference via `font-family: var(--font-display)` or the CSS class variables set on `<body>`.
- Scroll-triggered fade animations use custom `IntersectionObserver` hooks (`useFade`) defined inline in `app/page.tsx`. The `FadeUp`, `FadeLeft`, `FadeRight` wrappers accept an optional `delay` prop (seconds).

## Badge component

`app/components/Badge.tsx` accepts a `variant` prop:

`completed` | `inprogress` | `pending` | `recurring` | `paid` | `unpaid` | `low` | `ok`

An optional `label` prop overrides the default display text.

## External image domains

Only `images.unsplash.com` is whitelisted in `next.config.ts`. Add any new `next/image` domains there under `remotePatterns`.
