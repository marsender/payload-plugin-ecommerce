# @marsender/payload-plugin-ecommerce

A fork of [@payloadcms/plugin-ecommerce](https://github.com/payloadcms/payload/tree/main/packages/plugin-ecommerce) with custom enhancements.

## Installation

```bash
# From GitHub
pnpm add github:marsender/payload-plugin-ecommerce

# Or with a specific branch/tag
pnpm add github:marsender/payload-plugin-ecommerce#main
```

## Usage

```typescript
import { buildConfig } from 'payload'
import { ecommercePlugin } from '@marsender/payload-plugin-ecommerce'
import { stripeAdapter } from '@marsender/payload-plugin-ecommerce/payments/stripe'

export default buildConfig({
  plugins: [
    ecommercePlugin({
      customers: {
        slug: 'users',
      },
      payments: {
        paymentMethods: [
          stripeAdapter({
            stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
          }),
        ],
      },
      currencies: {
        supportedCurrencies: ['USD', 'EUR'],
        defaultCurrency: 'USD',
      },
    }),
  ],
})
```

## Features

- Products & Variants management
- Shopping Cart
- Orders & Transactions
- Address management
- Stripe payment integration
- Stripe Connect support (multi-vendor/marketplace payments)
- Multi-currency support

## Stripe Connect (Multi-Vendor Payments)

This plugin supports Stripe Connect for marketplace/multi-vendor scenarios where payments need to be routed to different connected accounts (e.g., different coaches, sellers, or vendors).

### Setup

1. Enable Stripe Connect on your platform Stripe account via the Stripe Dashboard
2. Each vendor/coach creates a Connected Account and you store their `connected_account_id`
3. Configure the `resolveConnectedAccount` callback in your stripeAdapter:

```typescript
import { ecommercePlugin } from '@marsender/payload-plugin-ecommerce'
import { stripeAdapter } from '@marsender/payload-plugin-ecommerce/payments/stripe'

export default buildConfig({
  plugins: [
    ecommercePlugin({
      customers: { slug: 'users' },
      payments: {
        paymentMethods: [
          stripeAdapter({
            secretKey: process.env.STRIPE_SECRET_KEY!,
            publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
            webhookSecret: process.env.STRIPE_WEBHOOKS_SIGNING_SECRET!,
            // Resolve the connected account from cart items
            resolveConnectedAccount: async ({ cart, req }) => {
              const firstItem = cart.items?.[0]
              if (!firstItem) return undefined

              const productId =
                typeof firstItem.product === 'object' ? firstItem.product.id : firstItem.product

              const product = await req.payload.findByID({
                collection: 'products',
                id: productId,
                depth: 1,
              })

              // Return the coach's/vendor's Stripe Connect account ID
              const coach = product.coach
              if (!coach || typeof coach !== 'object') return undefined

              return coach.stripeConnectAccountId || undefined
            },
          }),
        ],
      },
    }),
  ],
})
```

### How it works

- When `resolveConnectedAccount` is provided and returns a connected account ID, the PaymentIntent is created with `transfer_data.destination` set to that account
- The platform account processes the payment and automatically transfers funds to the connected account
- The `connectedAccountId` is stored in the transaction record for reference
- If no connected account is resolved, the payment goes to the platform account as usual

## Differences from upstream

This fork includes the following enhancements:

- **`refreshUser()` function in EcommerceProvider**: Exposes a `refreshUser()` function via `useEcommerce()` hook that allows the app to refresh the user state on demand. Call this after login/logout to sync the EcommerceProvider with the current auth state, enabling proper client-side navigation without full page reloads.

- **`deleteAddress()` function in EcommerceProvider**: Exposes a `deleteAddress(addressID)` function via `useEcommerce()` and `useAddresses()` hooks. This allows deleting addresses directly through the provider, which automatically refreshes the addresses list after deletion.

- **Simplified address `customer` field auto-assignment**: The `beforeChange` hook on the addresses collection now automatically sets the `customer` field to the current user's ID if not already provided. This works for all authenticated users (customers, admins, or users with multiple roles). Admins can still override by explicitly providing a `customer` ID when creating an address for another user.

- **Stripe Connect support**: Added `resolveConnectedAccount` option to `stripeAdapter()` that enables routing payments to different Stripe Connected Accounts. This is useful for marketplace/multi-vendor scenarios where each seller or coach has their own Stripe account. The connected account ID is stored in the transaction record for reference.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT - See [LICENSE.md](./LICENSE.md)

## Credits

Based on the official [PayloadCMS Ecommerce Plugin](https://github.com/payloadcms/payload/tree/main/packages/plugin-ecommerce).
