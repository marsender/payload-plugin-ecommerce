import { addDataAndFileToRequest, type DefaultDocumentIDType, type Endpoint } from 'payload'

import type { CurrenciesConfig, PaymentAdapter, ProductsValidation, SanitizedEcommercePluginConfig } from '../types/index.js'

import { GuestCheckoutDisabled } from '../utilities/errorCodes.js'

import { defaultProductsValidation } from '../utilities/defaultProductsValidation.js'

type Args = {
	/**
	 * Allow an unauthenticated caller to pay. Defaults to true.
	 */
	allowGuestCheckout?: boolean
	/**
	 * The slug of the carts collection, defaults to 'carts'.
	 */
	cartsSlug?: string
	currenciesConfig: CurrenciesConfig
	/**
	 * The slug of the customers collection, defaults to 'users'.
	 */
	customersSlug?: string
	/**
	 * Track inventory stock for the products and variants.
	 * Accepts an object to override the default field name.
	 */
	inventory?: SanitizedEcommercePluginConfig['inventory']
	paymentMethod: PaymentAdapter
	/**
	 * The slug of the products collection, defaults to 'products'.
	 */
	productsSlug?: string
	/**
	 * Customise the validation used for checking products or variants before a transaction is created.
	 */
	productsValidation?: ProductsValidation
	/**
	 * The slug of the transactions collection, defaults to 'transactions'.
	 */
	transactionsSlug?: string
	/**
	 * The slug of the variants collection, defaults to 'variants'.
	 */
	variantsSlug?: string
}

type InitiatePayment = (args: Args) => Endpoint['handler']

/**
 * Handles the endpoint for initiating payments. We will handle checking the amount and product and variant prices here before it is sent to the payment provider.
 * This is the first step in the payment process.
 */
export const initiatePaymentHandler: InitiatePayment =
	({ allowGuestCheckout = true, cartsSlug = 'carts', currenciesConfig, customersSlug = 'users', paymentMethod, productsSlug = 'products', productsValidation, transactionsSlug = 'transactions', variantsSlug = 'variants' }) =>
	async (req) => {
		await addDataAndFileToRequest(req)
		const data = req.data
		const payload = req.payload
		const user = req.user

		let currency: string = currenciesConfig.defaultCurrency
		let cartID: DefaultDocumentIDType = data?.cartID
		let cart = undefined
		const billingAddress = data?.billingAddress
		const shippingAddress = data?.shippingAddress

		let customerEmail: string = user?.email ?? ''

		if (user) {
			if (user.cart?.docs && Array.isArray(user.cart.docs) && user.cart.docs.length > 0) {
				if (!cartID && user.cart.docs[0]) {
					// Use the user's cart instead
					if (typeof user.cart.docs[0] === 'object') {
						cartID = user.cart.docs[0].id
						cart = user.cart.docs[0]
					} else {
						cartID = user.cart.docs[0]
					}
				}
			}
		} else if (!allowGuestCheckout) {
			// Paying is gated separately from holding a cart: a guest may have been allowed to fill a
			// basket and still owe an account before any money moves. Without this an unauthenticated
			// POST carrying any `customerEmail` buys, which voids every per-customer rule a consumer
			// applies in `productsValidation`.
			return Response.json(
				{
					cause: { code: GuestCheckoutDisabled },
					message: 'An account is required to complete this purchase.',
				},
				{
					status: 401,
				}
			)
		} else {
			// Get the email from the data if user is not available
			if (data?.customerEmail && typeof data.customerEmail === 'string') {
				customerEmail = data.customerEmail
			} else {
				return Response.json(
					{
						message: 'A customer email is required to make a purchase.',
					},
					{
						status: 400,
					}
				)
			}
		}

		if (!cart) {
			if (cartID) {
				cart = await payload.findByID({
					id: cartID,
					collection: cartsSlug,
					depth: 2,
					overrideAccess: false,
					req,
					select: {
						id: true,
						currency: true,
						customerEmail: true,
						items: true,
						subtotal: true,
						discountAmount: true,
					},
					user,
				})

				if (!cart) {
					return Response.json(
						{
							message: `Cart with ID ${cartID} not found.`,
						},
						{
							status: 404,
						}
					)
				}
			} else {
				return Response.json(
					{
						message: 'Cart ID is required.',
					},
					{
						status: 400,
					}
				)
			}
		}

		if (cart.currency && typeof cart.currency === 'string') {
			currency = cart.currency
		}

		// Ensure the currency is provided or inferred in some way
		if (!currency) {
			return Response.json(
				{
					message: 'Currency is required.',
				},
				{
					status: 400,
				}
			)
		}

		// Ensure the selected currency is supported
		if (!currenciesConfig.supportedCurrencies.find((c) => c.code.toLocaleLowerCase() === currency.toLocaleLowerCase())) {
			return Response.json(
				{
					message: `Currency ${currency} is not supported.`,
				},
				{
					status: 400,
				}
			)
		}

		// Verify the cart is available and items are present in an array
		if (!cart || !cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
			return Response.json(
				{
					message: 'Cart is required and must contain at least one item.',
				},
				{
					status: 400,
				}
			)
		}

		for (const item of cart.items) {
			const quantity = item.quantity || 1

			if (!item.product) {
				continue
			}

			const productID = typeof item.product === 'object' ? item.product.id : item.product

			// Deliberately no `select`: `productsValidation` is a consumer extension point, and a
			// projection of the fields this plugin happens to know about hands it `undefined` for
			// every field the consumer added to its own products collection.
			const product = await payload.findByID({
				id: productID,
				collection: productsSlug,
				depth: 0,
				req,
			})

			if (!product) {
				return Response.json(
					{
						message: `Product with ID ${productID} not found.`,
					},
					{
						status: 404,
					}
				)
			}

			let variant = undefined

			if (item.variant) {
				const variantID = typeof item.variant === 'object' ? item.variant.id : item.variant

				variant = await payload.findByID({
					id: variantID,
					collection: variantsSlug,
					depth: 0,
					req,
				})

				if (!variant) {
					return Response.json(
						{
							message: `Variant with ID ${variantID} not found.`,
						},
						{
							status: 404,
						}
					)
				}
			}

			// One call per line, variant or not. The variant branch used to be nested inside an
			// `item.product && !item.variant` guard, so it was unreachable and a variant line went
			// through with no price or stock check at all.
			try {
				const validate = productsValidation ?? defaultProductsValidation

				await validate({ cart, currenciesConfig, currency, product, quantity, req, variant })
			} catch (error) {
				payload.logger.error(error, 'Error validating product or variant during payment initiation.')

				return Response.json(
					{
						message: error,
						...(error instanceof Error ? { cause: error.cause } : {}),
					},
					{
						status: 400,
					}
				)
			}
		}

		try {
			const paymentResponse = await paymentMethod.initiatePayment({
				customersSlug,
				data: {
					billingAddress,
					cart,
					currency,
					customerEmail,
					shippingAddress,
				},
				req,
				transactionsSlug,
			})

			return Response.json(paymentResponse)
		} catch (error) {
			payload.logger.error(error, 'Error initiating payment.')

			return Response.json(
				{
					message: 'Error initiating payment.',
				},
				{
					status: 500,
				}
			)
		}
	}
