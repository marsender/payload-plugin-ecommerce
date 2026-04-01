# CLAUDE.md — Development Guidelines

## Project Overview

`@marsender/payload-plugin-ecommerce` is a fork of the official PayloadCMS ecommerce plugin, versioned to track PayloadCMS releases (e.g. `v3.80.3`). It adds multi-tenant cart support, Stripe Connect, and other enhancements not in upstream.

The package is distributed via GitHub tags and consumed as:
```
pnpm add github:marsender/payload-plugin-ecommerce#v<version>
```

## Package Manager

Always use **pnpm**. Never use npm or yarn.

## Build System

| Command | What it does |
|---|---|
| `pnpm build` | copyfiles → build:types (tsc declarations) → build:swc (transpile) |
| `pnpm type-check` | `tsc --noEmit` — run before committing |
| `pnpm lint` | ESLint on `src/` |
| `pnpm lint:fix` | ESLint auto-fix |
| `pnpm clean` | Remove `dist/` and `.tsbuildinfo` |

**Important:** The `dist/` directory is committed to git and rebuilt automatically by the pre-commit hook. Do not gitignore it.

## Pre-Commit Hook (Husky)

The `.husky/pre-commit` hook runs automatically on every commit:
1. Lints staged `.ts/.tsx` files with ESLint
2. Full incremental type-check (`tsc -b`)
3. Full build (`pnpm build`)
4. Stages the rebuilt `dist/` (`git add dist/`)

Do not bypass with `--no-verify` unless explicitly asked.

## Testing

Test files use `.spec.ts` suffix. There is **no jest.config** — tests currently have no runner configured. To run a specific spec, use a compatible Jest runner or add one. Do not assume `pnpm test` works.

## TypeScript

- **Strict mode** enabled
- **ESNext** target and module format (ESM only — `"type": "module"`)
- **Module resolution**: `bundler`
- All imports within `src/` must use the `.js` extension (ESM convention), even for `.ts` source files
- JSX: `react-jsx` automatic runtime

## Code Style

- ESLint with `typescript-eslint` recommended config
- No Prettier — ESLint handles all formatting
- Violations are warnings, not errors, for: `ban-ts-comment`, `no-empty-object-type`, `no-explicit-any`, `no-unused-vars`
- Unused variable pattern exception: names starting with `_`

## Project Structure

```
src/
├── collections/        # Payload collections (addresses, carts, orders, products, transactions, variants)
├── endpoints/          # REST API endpoints (confirmOrder, payment methods)
├── exports/            # Public API surfaces (client, payments/stripe, rsc, translations, types)
├── fields/             # Reusable Payload field definitions
├── payments/adapters/  # Payment adapter implementations (Stripe)
├── react/provider/     # EcommerceProvider React context
├── translations/       # i18n (38 languages)
├── types/              # TypeScript types
├── ui/                 # React UI components
└── utilities/          # Shared helpers and validation
```

Main entry: `src/index.ts` — exports `ecommercePlugin` factory function.

## Key Files

- [src/utilities/sanitizePluginConfig.ts](src/utilities/sanitizePluginConfig.ts) — applies defaults to plugin config
- [src/index.ts](src/index.ts) — plugin factory, wires collections/endpoints/translations
- [src/exports/payments/stripe/index.ts](src/exports/payments/stripe/index.ts) — Stripe adapter public export
- [src/react/provider/index.tsx](src/react/provider/index.tsx) — EcommerceProvider with `refreshUser`, `deleteAddress`, `mergeCart`, etc.

## Plugin Config Defaults (from sanitizePluginConfig)

| Option | Default |
|---|---|
| `customers.slug` | `'users'` |
| `currencies.defaultCurrency` | `'USD'` |
| `inventory.fieldName` | `'inventory'` |
| `carts.allowGuestCarts` | `true` |
| `orders` | `true` |
| `transactions` | `true` |
| `payments.paymentMethods` | `[]` |
| `products.variants` | `true` |
| `access.isAuthenticated` | `({ req }) => Boolean(req?.user)` |
| `access.publicAccess` | `() => true` |

## Peer Dependencies

Must be provided by the consuming project:
- `payload ^3.0.0`
- `@payloadcms/ui ^3.0.0`
- `@payloadcms/translations ^3.0.0`
- `react ^19.0.0`, `react-dom ^19.0.0`
- `stripe ^20.0.0` (optional, only if using Stripe adapter)

## Release Workflow

```bash
# 1. Make changes in src/, then:
pnpm type-check && pnpm build

# 2. Update package.json version to match target PayloadCMS version

# 3. Update CHANGELOG.md

# 4. Commit (pre-commit hook rebuilds dist/ automatically)
git add .
git commit -m "<message>"
git push

# 5. Tag the release
git tag v<version>
git push origin v<version>
```

## Multi-Tenant Carts

When `carts.multiTenant.enabled = true`:
- Do NOT add `carts` to `@payloadcms/plugin-multi-tenant` collections list
- Tenant is auto-populated from `payload-tenant` or `payload-tenant-domain` cookies
- Access is scoped: super-admins see all, tenant-admins see their tenant, users see own carts, guests use secret tokens

## Stripe Notes

- Uses Stripe Node SDK v20 (Clover) with API version `2025-09-30.clover`
- `resolveConnectedAccount` callback enables Stripe Connect (marketplace routing)
- Connected account ID is stored on the transaction record
