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

- _(Add your changes here)_

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT - See [LICENSE.md](./LICENSE.md)

## Credits

Based on the official [PayloadCMS Ecommerce Plugin](https://github.com/payloadcms/payload/tree/main/packages/plugin-ecommerce).
