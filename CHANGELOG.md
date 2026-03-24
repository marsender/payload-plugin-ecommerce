# Changelog

All notable changes to `@marsender/payload-plugin-ecommerce` are documented here.

This project follows [Semantic Versioning](https://semver.org/). Version numbers track
the compatible PayloadCMS release (e.g. `3.80.x` is compatible with PayloadCMS `3.80.x`).
Patch versions (e.g. `3.80.1`) denote plugin-internal fixes that do not change
PayloadCMS compatibility.

---

## [3.80.1] — 2026-03-24

### Security

- **Stripe webhook handler is now fail-closed.**
  Previously, the handler returned HTTP 200 for requests that should have been rejected,
  creating two exploitable gaps:

  | Scenario | Before | After |
  |----------|--------|-------|
  | `stripe-signature` header missing | HTTP 200 (silent pass) | HTTP 400 |
  | Webhook secret not configured for tenant | HTTP 200 (silent pass) | HTTP 500 |
  | Secret key not configured for tenant | HTTP 200 (silent pass) | HTTP 500 |
  | Invalid or replayed signature | HTTP 400, `{ received: true }` | HTTP 400, `{ received: false }` |
  | Valid event | HTTP 200 ✅ | HTTP 200 ✅ (unchanged) |

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

| Version | Notable changes |
|---------|----------------|
| 3.78.0 | Upgraded to PayloadCMS 3.78.0 |
| 3.77.0 | Upgraded to PayloadCMS 3.77.0 |
| 3.76.1 | Upgraded to PayloadCMS 3.76.1; multi-tenant variant type filtering; fix variant deletion on product delete |
| 3.75.0 | Upgraded to PayloadCMS 3.75.0; applied variant trash fix |
| 3.74.0 | Upgraded to PayloadCMS 3.74.0; added i18n restructure; new confirm-order params |
| 3.73.0 | Upgraded to PayloadCMS 3.73.0 |
| 1.0.0  | Initial fork from `@payloadcms/plugin-ecommerce`; added multi-tenant cart support, Stripe Connect, `refreshUser()`, `deleteAddress()`, simplified address auto-assignment |
