# Changelog

All notable changes to `@marsender/payload-plugin-ecommerce` are documented here.

This project follows [Semantic Versioning](https://semver.org/). Version numbers track
the compatible PayloadCMS release (e.g. `3.80.x` is compatible with PayloadCMS `3.80.x`).
Patch versions (e.g. `3.80.1`) denote plugin-internal fixes that do not change
PayloadCMS compatibility.

---

## [3.89.3] — 2026-09-12

### Security

- **Stripe `confirmOrder` only lets the buyer confirm.** It assigned the order to whoever called,
  and the PaymentIntent id it takes travels in the `return_url` query string. Since 3.89.2 the
  first confirmation wins, so a stranger confirming a leaked id first would have owned the order
  and its credits, and the buyer's own confirmation would have been handed that stranger's order.
  A transaction recorded with a `customer` can now only be confirmed by that user (an email in the
  request does not stand in for the account); a guest transaction only with the email it was
  initiated with, compared case-insensitively. A transaction with neither is refused. The check
  runs under the lock, before an existing order is returned. The PaymentIntent's cart must also
  be the transaction's cart. Deviation from upstream.

## [3.89.2] — 2026-09-12

### Fixed

- **Stripe `confirmOrder` creates one order per PaymentIntent, however often it is called.** A
  storefront confirms both from the page that took the payment and from the `return_url` of a
  redirect-based method, and on a phone both can run at once (seen in production 0.4 s apart).
  Each found the pending transaction and created its own order, so one charge granted everything
  twice. The check and the writes now run under `withCartLock`, the lock `initiatePayment` already
  takes on the cart; a later call returns the existing order. It returns no `transactionID`, so
  the confirm-order endpoint does not adjust inventory a second time, and no `accessToken`.
  `ConfirmOrderReturnType.transactionID` is optional accordingly. Deviation from upstream.

## [3.89.1] — 2026-09-11

### Fixed

- **Cart operations reject when they fail.** `addItem`, `removeItem`, `incrementItem`,
  `decrementItem` and `clearCart` caught every error and logged it only under `debug`, so the
  promise resolved whether or not the write happened, and a storefront confirmed "added to cart"
  for an item that never reached the cart. They now reject. A refresh that fails after a
  successful write still resolves, since a retry would repeat the write. Callers that relied on
  these never rejecting must now handle the rejection. Deviation from upstream, which still
  swallows.
- **A cart that no longer exists is forgotten instead of failing every later operation.** The item
  endpoints answer a missing cart with a 404, which the provider turned into a (swallowed) error
  before its own "cart not found" branch could run, so the stale cart id was kept forever. The
  cart state is now reset: `addItem` starts a new cart with the item, the other operations
  resolve. A 404 whose body still carries the cart (the cart exists, only the item is already
  gone, e.g. a double click on remove) keeps the cart and refreshes it instead.

## [3.86.10] — 2026-09-10

### Fixed

- **Stripe `initiatePayment` no longer creates duplicate transactions for concurrent requests.**
  The customer lookup, pending-transaction lookup, PaymentIntent reuse/creation and transaction
  write now run under `withCartLock` (new export), a Postgres transaction-scoped advisory lock on
  the cart, keyed on the id's string form. Waiters poll `pg_try_advisory_xact_lock` and release
  their connection between attempts, and time out after 30 s, so queued waiters cannot exhaust the
  pool. `resolveConnectedAccount` now runs before the lock. The dead `id`-conflict fallback on
  create is removed.
- **Stripe `initiatePayment` reuses an existing PaymentIntent only when it describes the same
  payment** (amount, currency, customer, Connect destination, adapter-owned metadata), via the new
  `classifyExistingPaymentIntent` export; a mismatched payable intent is cancelled and replaced.
  Previously a refilled cart could be charged the old amount for the old items.
- **Stripe `initiatePayment` refuses to start a payment while the cart's pending transaction holds
  a `succeeded`, `processing` or `requires_capture` PaymentIntent**, instead of overwriting its
  `paymentIntentID` (orphaning a completed charge) or failing on a `processing` cancel.

---

## [3.84.0] — 2026-04-22

### Added

- **Locale-aware currency formatting (upstream #15139).**
  - New `formatPrice({ baseValue, currency, locale })` utility in `src/ui/utilities.ts`,
    using `Intl.NumberFormat` for locale-correct currency output.
  - New optional `symbolDisplay?: 'code' | 'symbol'` field on the `Currency` type.
  - `useCurrency().formatCurrency` now accepts an optional `locale` option and respects
    `currency.symbolDisplay`.

### Changed

- **PriceCell / PriceRowLabel migrated to `formatPrice`.** Both UI components now use
  `Intl.NumberFormat` via `formatPrice`, picking up the admin panel locale from
  `useTranslation().i18n.language`. This replaces the previous `convertFromBaseValue` +
  manual symbol prefix.

### Fixed

- **Stripe `confirmOrder` now verifies `PaymentIntent.status === 'succeeded'` before
  creating an order (upstream #15902).** Prevents orders from being created for
  PaymentIntents that are still pending / require additional action / failed.

### Fork deviations

- **`formatCurrency` default locale**: upstream defaults to `'en'`; the fork keeps the
  `undefined` default so `Intl.NumberFormat` falls back to the user's browser locale —
  required for multi-language consuming apps (e.g. lemodule fr/en). Explicit `locale`
  callers work identically to upstream.
- **Upstream `confirmOrder.spec.ts` not ported.** The upstream test targets a
  non-multi-tenant code path; the fork's `confirmOrder.ts` does per-tenant Stripe key
  resolution above the status guard. Integration coverage for the fork lives in the
  consuming application (lemodule).

### Address title select options

- The address `title` field is now a `select` with three options: Sir, Madam, Other.
- Added translations for English (`addressTitleSir`, `addressTitleMadam`, `addressTitleOther`)
  and French (`addressTitleSir` → "Monsieur", `addressTitleMadam` → "Madame", `addressTitleOther` → "Autre").
- Extended `PluginLanguage` translation type with optional keys for the new options.

---

## [3.83.0] — 2026-04-15

### Fixed

- **PriceCell**: price `0` now displays correctly instead of showing "price not set"
  (`!cellData` replaced with `cellData == null`).
- **PriceInput / FormattedInput**: `required` field status is now respected — the
  required indicator is shown on the price label when the field is marked required.

---

## [3.82.1] — 2026-04-09

### Changed

- **Version alignment with PayloadCMS 3.82.1.**
  No upstream plugin code changes between v3.81.0 and v3.82.1 — this release is a
  version bump only to maintain compatibility with the PayloadCMS 3.82.x release line.

---

## [3.80.3] — 2026-03-31

### Changed

- **Lint and type cleanup (no functional changes).**
  - `conditional()` in `accessComposition.ts`: condition parameter typed as `AccessArgs` instead of `any`, giving proper type-checking when writing access functions.
  - Removed superfluous `// eslint-disable-next-line no-console` comments from `EcommerceProvider` debug error blocks.
  - Renamed unused destructured parameters (`productsValidation` → `_productsValidation` in `confirmOrder.ts`, `currenciesConfig` → `_currenciesConfig` in `defaultProductsValidation.ts`) and tightened the variant forEach callback type in `validateOptions.ts`.
  - Added file-level `/* eslint-disable @typescript-eslint/no-explicit-any */` to spec files instead of per-line suppressions.

### Fixed

- **`formatCurrency` now uses locale-aware formatting.**
  The `useCurrency()` hook's `formatCurrency` function was using a hardcoded
  `` `${symbol}${value.toFixed(decimals)}` `` pattern, which always placed the symbol
  before the amount with an English decimal separator (e.g. `€90.00`). This is
  non-standard for many locales — French convention, for example, places the symbol
  after the amount with a comma separator (`90,00 €`).

  The function now delegates to `Intl.NumberFormat` with `style: 'currency'`, letting
  the browser's locale determine symbol position, decimal separator, and thousands
  separator automatically. The zero-amount special case has been removed as
  `Intl.NumberFormat` handles it correctly.

  | Locale        | Before   | After       |
  | ------------- | -------- | ----------- |
  | `fr-FR` / EUR | `€90.00` | `90,00 €`   |
  | `en-US` / EUR | `€90.00` | `€90.00` ✅ |
  | `fr-FR` / USD | `$90.00` | `90,00 $US` |
  | `en-US` / USD | `$90.00` | `$90.00` ✅ |

  **No breaking changes.** The `Currency` type, `useCurrency()` API, and `<Price>`
  component props are unchanged. Components using `suppressHydrationWarning` (such as
  the built-in `<Price>`) handle the SSR/client locale mismatch correctly.

---

## [3.80.2] — 2026-03-28

### Changed

- **Server-side guard for subscription cart items.**
  When computing the subtotal, the server now fetches `billingInterval` alongside the
  price and silently filters out any item whose product has `billingInterval !== 'none'`.
  A `[cart]` info message is logged for each filtered item so it remains visible in
  server logs.

---

## [3.80.1] — 2026-03-24

### Security

- **Stripe webhook handler is now fail-closed.**
  Previously, the handler returned HTTP 200 for requests that should have been rejected,
  creating two exploitable gaps:

  | Scenario                                 | Before                         | After                           |
  | ---------------------------------------- | ------------------------------ | ------------------------------- |
  | `stripe-signature` header missing        | HTTP 200 (silent pass)         | HTTP 400                        |
  | Webhook secret not configured for tenant | HTTP 200 (silent pass)         | HTTP 500                        |
  | Secret key not configured for tenant     | HTTP 200 (silent pass)         | HTTP 500                        |
  | Invalid or replayed signature            | HTTP 400, `{ received: true }` | HTTP 400, `{ received: false }` |
  | Valid event                              | HTTP 200 ✅                    | HTTP 200 ✅ (unchanged)         |

  The handler now uses sequential early-exit guards:
  1. Missing secret key → `500` (configuration error — Stripe will retry)
  2. Missing webhook secret → `500` (configuration error — Stripe will retry)
  3. Missing `stripe-signature` header → `400` (not a Stripe request — no retry)
  4. Invalid or replayed signature → `400` (Stripe's 5-minute tolerance window enforced)
  5. Valid event → `200`, handler dispatched normally

  **No breaking changes.** Consumer configuration (`secretKey`, `webhookSecret`,
  `webhooks`) is unchanged. Existing tenants with a properly configured webhook secret
  are unaffected.

---

## [3.80.0] — 2026-03-05

### Changed

- Upgraded to PayloadCMS 3.80.0 compatibility.

---

## [3.79.5] — 2026-02-24

### Changed

- Migrated CI/CD to GitHub Actions with OIDC trusted publishing (replaces `NPM_TOKEN`).
- GitHub Releases are now the primary distribution channel; npm publish removed from workflow.

---

## [3.79.4] — 2026-02-10

### Changed

- Internal version bump; no functional changes.

---

## [3.79.3] — 2026-02-07

### Fixed

- `EcommerceProvider` now receives the current locale so locale-dependent UI renders correctly.
- Removed hard-coded Stripe API version from the adapter; Stripe SDK default is used instead.

---

## [3.79.2] — 2026-01-30

### Changed

- Internal version bump aligning with PayloadCMS 3.79.2.

---

## [3.79.1] — 2026-01-24

### Fixed

- Stripe payment transactions are now cleaned up on failure: duplicate or stale transaction
  records are removed before creating a new one, preventing orphaned entries.

---

## [3.79.0] — 2026-01-20

### Changed

- Upgraded to PayloadCMS 3.79.0 compatibility.

### Fixed

- Stripe payment amount now computed from `cart.subtotal` minus `discountAmount` (instead of
  raw `cart.total`) to correctly apply coupon discounts at the payment intent creation step.

---

## Earlier versions (pre-3.79.0)

| Version | Notable changes                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.78.0  | Upgraded to PayloadCMS 3.78.0                                                                                                                                             |
| 3.77.0  | Upgraded to PayloadCMS 3.77.0                                                                                                                                             |
| 3.76.1  | Upgraded to PayloadCMS 3.76.1; multi-tenant variant type filtering; fix variant deletion on product delete                                                                |
| 3.75.0  | Upgraded to PayloadCMS 3.75.0; applied variant trash fix                                                                                                                  |
| 3.74.0  | Upgraded to PayloadCMS 3.74.0; added i18n restructure; new confirm-order params                                                                                           |
| 3.73.0  | Upgraded to PayloadCMS 3.73.0                                                                                                                                             |
| 1.0.0   | Initial fork from `@payloadcms/plugin-ecommerce`; added multi-tenant cart support, Stripe Connect, `refreshUser()`, `deleteAddress()`, simplified address auto-assignment |
