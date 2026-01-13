# @marsender/payload-plugin-ecommerce

A fork of [@payloadcms/plugin-ecommerce](https://github.com/payloadcms/payload/tree/main/packages/plugin-ecommerce) with custom enhancements.

## Installation

```bash
# From GitHub
pnpm add github:marsender/payload-plugin-ecommerce
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
- Shopping Cart with server-side operations
- Orders & Transactions
- Address management
- Stripe payment integration
- Stripe Connect support (multi-vendor/marketplace payments)
- Multi-currency support
- Guest cart support with automatic merge on login
- Cart item operations via REST endpoints

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

							const productId = typeof firstItem.product === 'object' ? firstItem.product.id : firstItem.product

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

## Cart Operations

The plugin provides server-side cart operations via REST endpoints for reliable cart manipulation:

### Endpoints

- `POST /api/carts/:id/add-item` - Add an item to the cart
- `POST /api/carts/:id/update-item` - Update item quantity (supports `{ $inc: n }` for increment/decrement)
- `POST /api/carts/:id/remove-item` - Remove an item from the cart
- `POST /api/carts/:id/clear` - Clear all items from the cart
- `POST /api/carts/:id/merge` - Merge a guest cart into an authenticated user's cart

### Server-Side Functions

You can also use the cart operations directly in your server-side code:

```typescript
import { addItem, removeItem, updateItem, clearCart, mergeCart } from '@marsender/payload-plugin-ecommerce'

// Add an item
await addItem({
  payload,
  cartsSlug: 'carts',
  cartID: 'cart-123',
  item: { product: 'product-id', variant: 'variant-id' },
  quantity: 2,
})

// Update quantity (increment by 1)
await updateItem({
  payload,
  cartsSlug: 'carts',
  cartID: 'cart-123',
  itemID: 'item-row-id',
  quantity: { $inc: 1 },
})

// Merge guest cart into user cart
await mergeCart({
  payload,
  cartsSlug: 'carts',
  targetCartID: 'user-cart-123',
  sourceCartID: 'guest-cart-456',
  sourceSecret: 'guest-cart-secret',
})
```

### Custom Cart Item Matcher

You can provide a custom `cartItemMatcher` function to define when cart items should be considered the same (and have their quantities combined):

```typescript
ecommercePlugin({
  carts: {
    cartItemMatcher: ({ existingItem, newItem }) => {
      // Match by product, variant, AND custom delivery option
      const productMatch = existingItem.product === newItem.product
      const variantMatch = existingItem.variant === newItem.variant
      const deliveryMatch = existingItem.deliveryOption === newItem.deliveryOption
      return productMatch && variantMatch && deliveryMatch
    },
  },
})
```

## Differences from upstream

This fork includes the following enhancements:

- **`refreshUser()` function in EcommerceProvider**: Exposes a `refreshUser()` function via `useEcommerce()` hook that allows the app to refresh the user state on demand. Call this after login/logout to sync the EcommerceProvider with the current auth state, enabling proper client-side navigation without full page reloads.

- **`deleteAddress()` function in EcommerceProvider**: Exposes a `deleteAddress(addressID)` function via `useEcommerce()` and `useAddresses()` hooks. This allows deleting addresses directly through the provider, which automatically refreshes the addresses list after deletion.

- **Simplified address `customer` field auto-assignment**: The `beforeChange` hook on the addresses collection now automatically sets the `customer` field to the current user's ID if not already provided. This works for all authenticated users (customers, admins, or users with multiple roles). Admins can still override by explicitly providing a `customer` ID when creating an address for another user.

- **Stripe Connect support**: Added `resolveConnectedAccount` option to `stripeAdapter()` that enables routing payments to different Stripe Connected Accounts. This is useful for marketplace/multi-vendor scenarios where each seller or coach has their own Stripe account. The connected account ID is stored in the transaction record for reference.

- **Stripe SDK v20 (Clover)**: Upgraded to Stripe Node.js SDK v20 with API version `2025-09-30.clover`. This version uses Stripe's new biannual release train versioning. See [Stripe's versioning policy](https://docs.stripe.com/sdks/versioning) for details.

## What's New in 3.71.0

Synchronized with PayloadCMS plugin-ecommerce v3.71.0:

- **Server-side cart operations**: Cart operations (addItem, removeItem, updateItem, clearCart) now use server-side endpoints for improved reliability and consistency
- **Cart merge endpoint**: New `/merge` endpoint for merging guest carts into authenticated user carts on login
- **Custom cart item matcher**: Configure `cartItemMatcher` to define custom item matching logic
- **`variantTypesSlug` parameter**: Added to `createVariantsCollection` for custom variant type collection slugs
- **New React provider functions**: `clearSession`, `mergeCart`, `onLogin`, `onLogout`, `refreshCart`, `config`, `user`
- **Type improvements**: New types `CartItemMatcher`, `CartItemMatcherArgs`, `EcommerceConfig`, `SanitizedAccessConfig`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT - See [LICENSE.md](./LICENSE.md)

## Credits

Based on the official [PayloadCMS Ecommerce Plugin](https://github.com/payloadcms/payload/tree/main/packages/plugin-ecommerce).
