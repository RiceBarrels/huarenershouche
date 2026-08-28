# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

常來車網 (CLCAuto) — a bilingual (Chinese/English) used car marketplace for Chinese communities in North America. Built with Next.js App Router, TypeScript, Tailwind CSS v4, and Supabase as the backend. use bun as cli.

## Commands

```bash
bun run dev      # Start dev server (port 3000)
bun run build    # Production build
bun run start    # Start production server
bun run lint     # ESLint
```

No test framework is configured.

## Architecture

**Routing:** Next.js App Router with file-based routing under `app/[locale]/` — path-based i18n with `/zh/...`, `/en/...`, `/ko/...` trees (all prerendered per locale for SEO). Dynamic routes at `/car/[id]` and `/user/[id]`. Old unprefixed URLs 301 to `/zh/...` via `vercel.json`.

**i18n:** Chinese source text is the translation key: `t("发布车辆")` from `useI18n()` (`components/i18n-provider.tsx`); dictionaries in `lib/i18n/en.ts` / `lib/i18n/ko.ts` (missing keys fall back to Chinese; Korean brand name is 또와카). DB enum values (fuel_type "汽油", colors, transmission) are stored in Chinese — always render them through `t(...)`, and locations through `carLocation(car, locale)`. Listing/post content for lazy locales (ko) is translated on demand by `/api/translate-listing` and `/api/translate-post` (OpenRouter) and cached in the `other_i18n` jsonb column (`supabase/other-i18n.sql`); community posts show an X-style "translated · show original" toggle on non-zh locales. Internal links/router must import from `@/components/localized-navigation` (drop-in `Link`/`useRouter`/`usePathname` that auto-prefix the locale and strip it from pathname). Bilingual car data via `carTitle(car, locale)`/`carDescription(car, locale)` from `lib/i18n` — show one language only, never both titles. Web: language switch navigates between locale trees. Capacitor: root `app/page.tsx` picks the tree from localStorage/browser language; in-app switching swaps text via context without navigation. Server Components with Chinese metadata/SEO landing pages (`/cars/*`, guide/terms prose) intentionally stay Chinese.

**Backend:** Supabase PostgreSQL with RLS. Key tables: `cars`, `profiles`, `conversations`, `messages`, `comments`, `dealer_stores`. RPC functions: `increment_views`, `get_unread_count`. Client initialized in `lib/supabase.ts`.

**State:** Component-level `useState`/`useEffect`. Persistent data stored in `localStorage` (favorites, search history, recently viewed, post drafts).

**Types:** All database interfaces (`DbCar`, `DbProfile`, `DbConversation`, `DbMessage`, `DbComment`, `DbDealerStore`) are in `lib/types.ts`.

**UI Components:** shadcn/ui primitives in `components/ui/`. Feature components (car-card, search-filters, chat-thread, auth-dialog, etc.) in `components/`.

**Path alias:** `@/*` maps to the project root.

## Design System (from agents.md)

Philosophy: "工具感而非科技感" — tool-like, not tech-like. Anti-AI aesthetics.

- **Colors:** Stone/Slate palette, pure white/deep gray. No neon, no high-saturation gradients.
- **Border radius:** 0.3rem (small, sharp). Avoid `rounded-2xl` or `rounded-full`.
- **Shadows:** 1px borders or thin inner shadows. No glow effects.
- **Typography:** Geist Mono or system monospace. No round sans-serif.
- **Icons:** Lucide React at 1.5px stroke width.
- **Interactions:** Instant feedback, micro-movements. No slow typewriter or particle effects.

## Key Dependencies

- **@supabase/supabase-js** — all backend operations
- **framer-motion** — page transitions, staggered animations (`lib/motion.ts` has shared variants)
- **leaflet + react-leaflet** — map rendering for dealer stores
- **pinyin-pro** — Chinese pinyin matching for search
- **cmdk** — command palette / combobox search
- **next-themes** — dark/light mode
- **web-haptics** — mobile haptic feedback

## Environment Variables

All `NEXT_PUBLIC_*` (client-exposed):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps Geocoding API (`lib/geocode.ts`)
- `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` — OpenPanel analytics (`components/openpanel.tsx`)

Server-only:
- `OPENPANEL_CLIENT_SECRET` — OpenPanel server-side tracking (`lib/openpanel-server.ts`)
