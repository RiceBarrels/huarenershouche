# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HuarenCars (华人二手车) — a bilingual (Chinese/English) used car marketplace for Chinese communities in North America. Built with Next.js App Router, TypeScript, Tailwind CSS v4, and Supabase as the backend.

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

**Routing:** Next.js App Router with file-based routing. Dynamic routes at `/car/[id]` and `/user/[id]`. No API routes — all data flows through the Supabase client directly.

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
