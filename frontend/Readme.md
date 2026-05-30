# Eval Frontend

Next.js frontend for the SRS-defined AI video comparison system.

## Overview

The frontend provides the user-facing workspace for:

- submitting two supported video URLs
- tracking backend ingestion progress
- viewing side-by-side comparison results
- reading transcript-backed citations
- chatting with the analysis system over SSE

The frontend is wired to the live backend API. It does not ship mock comparison data for runtime ingestion.

## Stack

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Tailwind CSS v4`
- `Zustand`
- `react-markdown`
- shadcn-style UI primitives under `components/ui`

## Local Run

1. Install dependencies:

```powershell
npm install
```

2. Create a local env file from the example:

```powershell
copy .env.local.example .env.local
```

3. Make sure the backend is running, then start the frontend:

```powershell
npm run dev
```

Default app URL:

```txt
http://localhost:3000
```

## Environment

Current frontend env:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

This should point to the backend API base URL, not the frontend URL.

## Scripts

```powershell
npm run dev
npm run build
npm run start
npm run lint
```

## Current Features

- two-slot video submission with either supported platform in either slot
- backend session creation and polling
- comparison pipeline progress display
- persisted session restoration after refresh
- side-by-side comparison cards for Video A and Video B
- transcript excerpt and citation rendering
- SSE chat streaming with backend-generated answers
- clear session flow

## Supported Backend Contracts

The frontend currently consumes:

- `POST /api/ingest`
- `GET /api/ingest/session/:sessionId`
- `GET /api/video/:id`
- `POST /api/chat`

## Project Structure

- `app/`: Next.js App Router entrypoints
- `components/`: dashboard and UI components
- `components/ui/`: shared UI primitives
- `stores/`: Zustand state store
- `lib/api.ts`: backend integration and SSE parsing
- `lib/mock-data.ts`: UI-only prompt starters and shared frontend types

## Notes

- The frontend depends on a live backend; by itself it does not perform ingestion or analysis.
- If the backend fails ingestion because of missing `yt-dlp`, provider limits, or transcription issues, the frontend will surface that failure rather than substituting fake data.
- Fresh sessions should be used when validating new ingestion behavior.
