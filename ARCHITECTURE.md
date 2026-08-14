# Architecture

## Overview

This is a frontend-only news aggregator application that fetches articles from multiple news APIs (NewsAPI, The Guardian, and NYT) directly from the browser. This architecture was chosen to match the project's stated scope of a frontend-only deliverable.

## Security & Reliability Trade-offs

A backend proxy would resolve key exposure and CORS reliability issues, and would be the correct production architecture. However, this project has been scoped to match the brief's stated frontend-project deliverable. The provider-isolation pattern below ensures that a source being unreachable degrades gracefully rather than breaking the app.

### API Key Exposure

API keys are embedded in the built JavaScript bundle and can be read by anyone using browser developer tools. This is a known, deliberate trade-off, accepted to match the project's stated frontend-only scope, not an oversight.

### CORS Reliability

- NewsAPI's free tier only allows CORS from `localhost`, it will hard-fail if this is ever opened from a deployed URL instead of a local dev server.
- The Guardian's API has no documented CORS support at all, calls may fail from the browser regardless of origin, including localhost.

## Provider Isolation

The application uses an `AggregatorService.search()` that uses `Promise.allSettled` across all three providers (never `Promise.all`). A rejected provider must not reject the whole aggregation. Return a per-source status alongside merged results to surface failed sources as dismissible notices rather than full-page errors.

## Reliability Patterns

1. **Retry only transient failures** - timeouts and 5xx, with max 2 attempts and capped exponential backoff. Never retry a 4xx (rate limit, bad key); that just burns more of a scarce daily quota.
2. **Every request gets an `AbortController`** - Cancel the previous request when the user types again or changes a filter, don't let stale responses overwrite fresh ones.
3. **Client-side throttle on search input (~300ms debounce)** - Treat NewsAPI's 100 req/day cap as a hard budget, not a suggestion.

## Validation

All inbound vendor response data is validated with Zod before it enters app state to prevent malformed data from crashing components.
