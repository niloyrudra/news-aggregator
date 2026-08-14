# innoscripta News Aggregator

A React 18 + TypeScript news aggregator pulling articles from multiple sources (NewsAPI, The Guardian, New York Times) with search, filtering, personalization, and mobile-responsive design.

## Features

- **Article Search & Filtering** — Search by keyword; filter by date range, category, and source
- **Personalized News Feed** — Customize feed by selecting preferred sources, categories, and authors (persisted to localStorage)
- **Mobile-Responsive Design** — Optimized for desktop and mobile with collapsible filter sidebar
- **Pagination** — Page number navigation (20 articles per page)
- **Graceful Degradation** — Per-source failure isolation; failed providers don't break the feed
- **URL-Backed State** — All filters in URL for shareable/bookmarkable results

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and add your API keys
cp .env.example .env
# Edit .env with your keys (see "API Keys" below)

# 3. Start dev server
npm run dev
```

Open <http://localhost:5173>

## API Keys

You need free API keys from three providers:

| Provider | Signup URL | Free Tier |
| ---------- | ------------ | ----------- |
| **NewsAPI** | <https://newsapi.org/register> | 100 requests/day, localhost only (CORS) |
| **The Guardian** | <https://open-platform.theguardian.com/access/> | Free, CORS support undocumented |
| **NY Times** | <https://developer.nytimes.com/get-started> | 500 requests/day |

Add them to `.env`:

```env
VITE_NEWSAPI_KEY=your_newsapi_key
VITE_GUARDIAN_KEY=your_guardian_key
VITE_NYT_KEY=your_nyt_key
```

## Docker

### Build & Run

```bash
# Build and start (requires API keys in env)
docker compose up --build
```

Open <http://localhost:8080>

### Environment Variables for Docker

Create a `.env` file in the project root (same as local dev) or export them:

```bash
export VITE_NEWSAPI_KEY=your_key
export VITE_GUARDIAN_KEY=your_key
export VITE_NYT_KEY=your_key
docker compose up --build
```

> **Note:** Vite env vars are **build-time only**. They must be passed as `docker build` args (handled automatically by `docker compose` via the `.env` file). They will NOT work if passed at `docker run` time.

## Project Structure

```text
src/
  features/
    feed/           # ArticleList, ArticleCard, FilterSidebar, FeedPage
    search/         # SearchBar
    preferences/    # SourceSelector, CategorySelector, PreferencesPage, store
  services/
    providers/      # NewsApiProvider, GuardianProvider, NytProvider
    aggregator.ts   # Fans out to providers, merges + isolates failures
    BaseHttpProvider.ts  # Shared HTTP logic (timeout, retry, abort)
  contracts/        # Article, SearchParams, NewsProvider types (Zod schemas)
  hooks/            # useArticles (TanStack Query), useSearchFilters, useDebounce
  lib/              # urlSearchFilters, http client, env access
  components/ui/    # Reusable primitives (NavigationItem, etc.)
```

## Architecture Highlights

- **Provider Adapter Pattern** — All sources implement `NewsProvider` interface; adding a 4th source touches only one file
- **Dependency Inversion** — `AggregatorService` depends on `NewsProvider[]`, not concrete classes
- **Failure Isolation** — `Promise.allSettled` ensures one provider failure returns partial results + per-source status
- **State Management** — URL params for filters (shareable), TanStack Query for server data, Zustand + persist for preferences
- **Security** — API keys only in provider files; Zod validation on all external data; HTML sanitization on render

## Testing

```bash
# Run unit tests
npx vitest run

# Run unit tests with UI
npx vitest --ui

# Run e2e tests (Playwright)
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui
```

Test coverage includes:

- Provider adapter mapping (NewsAPI, Guardian, NYT)
- AggregatorService failure isolation (`Promise.allSettled`)
- Preferences store Zod validation on load
- useDebounce hook behavior
- useSearchFilters URL sync
- E2E: Search, filtering, pagination, navigation, preferences, responsive design, URL persistence

## Linting & Type Checking

```bash
npm run lint      # ESLint + React Compiler checks
npm run build     # TypeScript + Vite build
```

## Frontend-Only Trade-off

This project calls all three APIs **directly from the browser** per the brief's frontend-only scope. This means:

- API keys ship in the client bundle (visible in DevTools)
- NewsAPI free tier only works from `localhost` (CORS restriction)
- Guardian & NYT CORS support is unreliable from deployed URLs

**This is a documented, deliberate trade-off** — not an oversight. A backend proxy would resolve key exposure and CORS reliability, and would be the correct production architecture. The provider-isolation pattern ensures a source being unreachable degrades gracefully rather than breaking the app.

See `ARCHITECTURE.md` for full reasoning.

## Scripts

| Command | Description |
| --------- | ------------- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests (vitest) |
| `npm run test:ui` | Run unit tests with UI |
| `npm run test:e2e` | Run e2e tests (Playwright) |
| `npm run test:e2e:ui` | Run e2e tests with UI |
