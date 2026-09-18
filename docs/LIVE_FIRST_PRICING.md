# LIVE FIRST PRICING - PRODUCT LOCK

## 1. Core truth

Airfare is not a stable daily commodity.

A displayed fare is meaningful only together with:
- exact search conditions
- provider/channel
- time checked
- offer expiry or TTL when available
- fare family / booking class when available
- included baggage and fees

Therefore the product must optimize for **verification now**, not historical prediction.

## 2. User flow

1. User selects route, date and passenger assumptions.
2. UI shows "Checking current fare".
3. Server calls one or more approved live providers.
4. Results are normalized and stamped with checked_at.
5. If the provider exposes expiry, show it.
6. User selects an offer.
7. Reprice that offer before booking/deeplink handoff when supported.
8. If price changed, replace the old value and show "Price changed since last check".

## 3. Freshness states

VERIFIED_NOW
- Live response in the active search session.
- Best state for the main board.

REPRICE_REQUIRED
- Offer was live but is old enough, or provider requires final repricing.

CACHED
- Previously observed/provider cached.
- Never mixed visually with verified live results.

DEMO
- UI development only.

## 4. Comparable history

History is optional and may be used only when the full search signature matches.

Example signature:

SGN|PQC|2026-10-23|OW|ADT1|Y|DIRECT|VND|CABIN_BAG|PROVIDER_X

Do not compare:
- different passenger counts
- different baggage assumptions
- different cabins
- different fare families when that changes inclusions
- different channels if prices/fees differ materially

## 5. Trend output

Trend should be conservative:
- "3 comparable checks in 6h: stable"
- "Lowest verified quote changed from X to Y"
- "Insufficient comparable checks"

Avoid:
- predicting that price will definitely rise/fall
- claiming a historical minimum is still buyable
- labelling cached prices as live

## 6. Public display priority

Top line:
- current verified lowest fare
- checked time
- live provider
- recheck/expiry state

Offer row:
- airline / flight
- departure/arrival
- exact total
- baggage
- fare family
- checked time
- reprice status

Secondary:
- optional trend
- optional nearby-date calendar
