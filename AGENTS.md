# AGENTS.md — EDGAR Deal Tape

This document provides an overview of the project for developers and AI agents.

## Project Overview

Displays a live scrolling ticker tape of recent M&A and securities filings from SEC EDGAR (S-4, F-4, tender offers, going-private transactions). The ticker is designed to be embedded as an iframe in Google Sites or any website.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 (admin), inline styles (ticker) |
| Data | SEC EDGAR Full-Text Search API |
| Storage | Netlify Blobs (cached JSON) |
| Scheduling | Netlify Functions (hourly cron) |
| Language | TypeScript 5 |
| Deployment | Netlify |

## Directory Structure

```
netlify/functions/
  fetch-edgar.mts       Scheduled function (every hour) — fetches EDGAR EFTS API,
                        stores results in Netlify Blobs under key 'latest'

src/routes/
  __root.tsx            App shell (html/head/body wrapper)
  index.tsx             Admin dashboard — filing table + embed code generator
  ticker.tsx            Standalone ticker tape page — the embeddable iframe target
  api/
    deals.ts            GET /api/deals — serves cached JSON from Blobs with CORS headers
```

## Key Data Flow

1. `fetch-edgar` Netlify Function runs every hour (`0 * * * *`)
2. Calls `https://efts.sec.gov/LATEST/search-index` with form types: S-4, F-4, SC TO-T, SC TO-I, SC 13E-3
3. Stores result as JSON in Netlify Blobs store `edgar-filings`, key `latest`
4. `/api/deals` reads from Blobs and returns JSON with CORS headers
5. `/ticker` page fetches `/api/deals` every 30 min, animates via `requestAnimationFrame`

## Non-obvious Decisions

- Ticker uses `position: fixed; inset: 0` to fill the iframe viewport cleanly
- Deals are duplicated (`[...deals, ...deals]`) for seamless infinite scroll; animation loops at `scrollWidth / 2`
- CORS headers on `/api/deals` allow direct client-side API use if needed
- The EDGAR EFTS API requires a `User-Agent` header or requests may be throttled
- Inline styles on ticker page prevent CSS conflicts when embedded in other sites

## Adding New Filing Types

Update `FILING_TYPES` in `netlify/functions/fetch-edgar.mts` and add entries to `FORM_LABELS` / `FORM_COLORS` in `src/routes/ticker.tsx` and `src/routes/index.tsx`.

## Development Commands

```bash
npm run dev              # Start dev server (port 3000)
netlify dev --port 8889  # Start with Netlify features (Blobs, Functions)
netlify functions:invoke fetch-edgar  # Manually trigger EDGAR fetch
```
