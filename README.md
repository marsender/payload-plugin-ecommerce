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
- Multi-currency support

## Differences from upstream

This fork includes the following enhancements:

- **`refreshUser()` function in EcommerceProvider**: Exposes a `refreshUser()` function via `useEcommerce()` hook that allows the app to refresh the user state on demand. Call this after login/logout to sync the EcommerceProvider with the current auth state, enabling proper client-side navigation without full page reloads.

- **`deleteAddress()` function in EcommerceProvider**: Exposes a `deleteAddress(addressID)` function via `useEcommerce()` and `useAddresses()` hooks. This allows deleting addresses directly through the provider, which automatically refreshes the addresses list after deletion.

- **Simplified address `customer` field auto-assignment**: The `beforeChange` hook on the addresses collection now automatically sets the `customer` field to the current user's ID if not already provided. This works for all authenticated users (customers, admins, or users with multiple roles). Admins can still override by explicitly providing a `customer` ID when creating an address for another user.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT - See [LICENSE.md](./LICENSE.md)

## Credits

Based on the official [PayloadCMS Ecommerce Plugin](https://github.com/payloadcms/payload/tree/main/packages/plugin-ecommerce).
