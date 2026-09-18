# JoTrip Airfare Watch

PQC-focused airfare checker for JoTrip Lab.

## Product rule - LIVE FIRST

The primary job of this product is to answer:

> What is the verified fare **right now** for this exact search?

Trend and historical intelligence are secondary. Airline fares can change by inventory bucket, booking class, fare family and channel, so historical values must never be treated as current truth.

## Price states

- **VERIFIED NOW** - a live provider returned or repriced the offer in the current user search session.
- **STALE / EXPIRED** - the offer was live, but its TTL has passed or it was not repriced recently enough.
- **CACHED** - previously observed or provider-cached fare. Useful only for orientation/calendar.
- **DEMO** - interface test data. Never shown as a buyable fare.

## Search signature

Historical comparisons are allowed only when the search conditions are comparable. Each quote should preserve a search signature containing at least:

- origin
- destination
- departure date
- trip type
- passenger mix
- cabin
- direct/stops preference
- currency
- baggage/fare-family assumptions
- provider/channel

A trend must not compare different search signatures.

## Live quote contract

Each normalized live offer should retain:

- provider
- provider_offer_id
- checked_at
- expires_at or ttl_seconds when supplied
- verification_status
- search_signature
- origin / destination
- departure_at / arrival_at
- airline / flight_number
- booking_class when supplied
- fare_brand / fare_family when supplied
- direct
- base_fare
- taxes_fees
- total_price
- currency
- baggage summary
- change/refund conditions when supplied
- deeplink or booking handoff

Before payment or booking handoff, the selected offer should be repriced again whenever the provider supports repricing.

## Architecture priority

1. Live airline / OTA / NDC / approved agency source for the user-selected query.
2. Reprice selected offer immediately before booking handoff.
3. Cached/calendar source only for discovery.
4. Optional comparable historical samples for trend analysis.

## Current prototype

The site can still fall back to demo or cached data while no approved live provider credential is configured. The UI must state the actual freshness explicitly.

API keys stay server-side and never ship to the browser.
