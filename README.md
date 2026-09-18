# JoTrip Airfare Watch

PQC-focused airfare intelligence prototype for JoTrip Lab.

## V1 prototype

The first version is intentionally simple and mobile-first:

- route/date search shell
- fare board by airline and departure time
- direct/morning/evening filters
- 7-day fare curve
- fare-level and trend signals
- clear LIVE / CACHED / DEMO data labels
- GitHub Pages deployment workflow

The current UI uses **demo data only**. It must not be presented as a live booking price source.

## Data rules

Every normalized fare record should retain:

- provider
- observed_at
- freshness: live | cached | demo
- origin / destination
- departure_at / arrival_at
- airline / flight_number
- direct
- base_fare
- taxes_fees
- total_price
- currency
- deeplink (optional)
- expires_at (optional)

Never relabel cached or demo data as live.

## Provider architecture

1. Calendar/discovery provider for broad date scanning where permitted.
2. Live-pricing provider for a user-selected route/date.
3. Historical snapshots owned by JoTrip for trend calculations.
4. Server-side adapter only. API keys must never be exposed in browser code.

## GitHub Pages

After merging the feature branch, open:

Settings → Pages → Build and deployment → Source → **GitHub Actions**

The included workflow will deploy the static prototype on pushes to main.

## Next technical step

Replace the demo adapter with a normalized server-side provider adapter, then validate real-world coverage for PQC routes before surfacing any result as live.
