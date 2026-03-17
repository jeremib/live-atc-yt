# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATC Listener is a full-stack web app for listening to multiple LiveATC air traffic control feeds and YouTube audio streams simultaneously. It proxies LiveATC streams server-side to bypass browser CORS restrictions and embeds YouTube streams client-side.

## Commands

- `npm run dev` — Start dev server (Express + Vite HMR) on port 5000
- `npm run build` — Build client (Vite → `dist/public/`) and server (esbuild → `dist/index.js`)
- `npm start` — Run production server
- `npm run check` — TypeScript type checking
- `npm run db:push` — Push Drizzle schema to PostgreSQL (requires `DATABASE_URL`)

## Architecture

**Monorepo structure with three main directories:**

- `server/` — Express backend serving API routes and proxied audio streams
- `client/` — React 18 SPA built with Vite
- `shared/` — Zod schemas and Drizzle ORM table definitions shared between client and server

**Server (`server/`):**
- `index.ts` — Express setup, middleware, Vite dev integration
- `routes.ts` — REST API (`/api/streams` CRUD, `/api/proxy/:id` audio proxy, `/api/validate-url`)
- `storage.ts` — MemStorage class (in-memory Map, no database required). Initializes with default ATL/BOS streams
- `services/streamService.ts` — Fetches/parses `.pls` playlist files, creates audio stream proxies
- `utils/plsParser.ts` — Regex-based PLS file parser

**Client (`client/src/`):**
- Routing via Wouter (single `/` route)
- Global state in `contexts/StreamContext.tsx` — manages stream list, playback, React Query integration
- `hooks/useAudioStreams.ts` — manages HTMLAudioElement instances per LiveATC stream, tracks AudioState (volume, play/pause, mute)
- YouTube streams use `react-youtube` component instead of HTMLAudioElement
- UI built with shadcn/ui (Radix primitives) + Tailwind CSS
- Stream data persisted to localStorage (`liveatc_youtube_proxy_*` keys)

**Two stream types with different playback paths:**
- **LiveATC**: Client → `/api/proxy/:id` → server fetches `.pls` → resolves audio URL → pipes stream to client → HTMLAudioElement
- **YouTube**: Client embeds video via react-youtube, audio controlled through YouTube API

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

## Deployment

Deployed to Fly.io (`liveatc-youtube-proxy`) via Docker (Node 20 Alpine). Config in `fly.toml` and `Dockerfile`.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (Neon serverless). Optional; app defaults to in-memory storage
- `NODE_ENV` — `development` or `production`
