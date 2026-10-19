# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

常來車網 (CLCAuto) — a multilingual used car marketplace (North America first, expanding to Australia/New Zealand). Built with Next.js App Router, TypeScript, Tailwind CSS v4, and Supabase as the backend. use bun as cli.

## Commands

```bash
bun run dev      # Start dev server (port 3000)
bun run build    # Production build
bun run start    # Start production server
bun run lint     # ESLint
```

No test framework is configured.

## Architecture

**Routing:** Next.js App Router with file-based routing under `app/[locale]/` — path-based i18n with `/zh/...`, `/zh-hant/...`, `/en/...`, `/ko/...` trees (all prerendered per locale for SEO). On the web `app/[locale]/layout.tsx` is the root layout and sets `<html lang>` per locale (zh → `zh-CN`); there is no `app/layout.tsx`. Dynamic routes at `/car/[id]`, `/user/[id]`, `/community/[id]`, `/community/t/[slug]` and `/qa/[id]`. Old unprefixed URLs redirect permanently to `/zh/...` via `vercel.json`. `bun run build:static` (Capacitor export, `scripts/build-static.ts`) swaps every `(page|layout|not-found).static.(tsx|ts)` into place — `app/layout.static.tsx` becomes the single root layout, `app/page.static.tsx` the entry — and hides the paths listed in `ignoreInStatic.json` (API routes, sitemaps, `app/global-not-found.tsx`). Sitemaps: `/sitemap.xml` indexes `/sitemaps/{L}-static.xml`, `/sitemaps/zh-seo.xml` and `/sitemaps/{L}-{car|post|qa|user|topic}-{p}.xml` (`lib/sitemap.ts`; service-role RPCs `sitemap_counts` / `sitemap_entries`, 1000 URLs per shard, regenerated hourly).

**i18n:** Chinese source text is the translation key: `t("发布车辆")` from `useI18n()` (`components/i18n-provider.tsx`); dictionaries in `lib/i18n/en.ts` / `lib/i18n/ko.ts` etc. (missing keys fall back to English first, then Chinese; Korean brand name is 또와카). DB enum values (fuel_type "汽油", colors, transmission) are stored in Chinese — always render them through `t(...)`, and locations through `carLocation(car, locale)`. User/dealer content is stored verbatim as the original (`cars.description_original` / `features_original`; post, comment, Q&A and review `title`/`content`) with its per-field source language detected and stored (`lib/i18n/detect.ts`). Translations are DB-driven: private schema `i18n` + triggers + RPCs in `supabase/i18n-v2.sql`, worker in `lib/i18n-pipeline/`, drained by the Vercel cron `/api/i18n/drain` (plus `/api/moderate` after writes, sync and API v1; operators run `bun scripts/i18n-backfill.ts` / `bun scripts/i18n-verify.ts`). Reads go through `rpc('i18n_bundle')` + `lib/i18n/content` (SSR helpers, pure resolver) and on the client `useLocalized` / `LocalizedText` / `TranslationNotice` ("Translated from X · Show original"). Never write `other_i18n`, `description`, `description_zh` or `features` from app code (frozen cache / pipeline-owned compat projections) — write `description_original` / `features_original`. Topics and feature tags resolve through the glossary (`lib/i18n/topics.ts`). Internal links/router must import from `@/components/localized-navigation` (drop-in `Link`/`useRouter`/`usePathname` that auto-prefix the locale and strip it from pathname). Car titles via `carTitle(car, locale)` from `lib/i18n` (deterministic from year/make/model/trim) — show one language only, never both titles. Web: language switch navigates between locale trees. Capacitor (static export, entry `app/page.static.tsx`) picks the tree from localStorage/browser language; in-app switching swaps text via context without navigation. Server Components with Chinese metadata/SEO landing pages (`/cars/*`, guide/terms prose) intentionally stay Chinese (Simplified source; K2 converts it to Traditional under `/zh-hant`).

**Traditional Chinese (`/zh-hant`):** UI language only — the database has no such language. Every locale passed to an RPC/query (`i18n_bundle`, `sitemap_*`, `topic_get`, `browse_facets`, API `p_locale`, translation pipeline) must go through `dbLocale(locale)` (`zh-hant` → `zh`), so the stored/served content is the Simplified version, which K2 (opencc, at render time) converts to Traditional for display. Use `isZhLocale(locale)` (not `locale === "zh"`) for Chinese-column choices (`title_zh`, `location_zh`, brand Chinese names), and `withZhHant(...)` when mapping DB available-language lists to site locales. Route-prefix regexes must list `zh-hant` before `zh`. Dictionary `lib/i18n/zh-hant.ts` is generated — never hand-edit it: change `lib/i18n/zh-hant-overrides.ts` (HK/TW wording) and rerun `bun scripts/gen-zh-hant.ts` (opencc-js); keys added later are converted at runtime on demand (`zh-hant-runtime.ts`), and a missing zh-hant key falls back to the Chinese key, never English. `<html lang>` is `zh-Hant`, dates format as `zh-HK`. `/` redirects to `/zh-hant` for zh-TW/zh-HK/zh-MO/zh-Hant browsers unless the `clc_locale` cookie says otherwise (`vercel.json` and `next.config.ts` rules must stay in sync; the language picker writes the cookie via `rememberLocaleCookie`). The Capacitor static bundle still exports only the `zh` tree; the zh-hant dictionary ships inside it and switches at runtime by system language.

**Seller languages:** `profiles.languages text[]` (`supabase/seller-languages.sql`, codes/labels in `lib/i18n/languages.ts`, picker in `components/language-picker.tsx`). Default browse sort (`sortCars(..., locale)`) and home recommendations (`rankCars` with `locale`) put sellers who speak the current UI language first; empty languages count as Chinese-speaking on `zh` only. Syndication adapters declare `languages` and the sync engine backfills the system account when empty. Any `cars` query that feeds ranking must join `profiles!seller_id(..., languages)`.

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
- `SUPABASE_SERVICE_ROLE_KEY` — service client (`lib/sources/service-client.ts`): sync, translation pipeline, sitemap RPCs
- `OPENROUTER_API_KEY` — the only model key (`lib/ai/openrouter.ts`): translation, language detection, glossary, moderation; unset = pipeline idle, pages keep showing originals
- `CRON_SECRET` — Vercel cron auth for `/api/sync` and `/api/i18n/drain`; `I18N_DRAIN_DISABLED=1` is the translation kill switch
