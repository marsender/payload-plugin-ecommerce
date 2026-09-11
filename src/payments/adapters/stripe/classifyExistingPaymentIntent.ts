import type { Stripe } from 'stripe'

/**
 * What `initiatePayment` may do with the PaymentIntent already attached to a cart's pending
 * transaction.
 *
 * - `reuse`: hand its client secret back. Only when it is still payable AND describes exactly the
 *   payment being asked for now.
 * - `replace`: create a new PaymentIntent. `cancel` says whether the old one must be cancelled
 *   first (it is still payable, so leaving it would leave a second way to pay for the cart).
 * - `refuse`: money has moved or is moving. Neither cancel it (Stripe rejects cancelling a
 *   `processing` intent, and a `succeeded` one is a charge) nor replace it (overwriting the
 *   transaction's PaymentIntent ID would orphan a payment that `confirmOrder` can then never turn
 *   into an order).
 */
export type ExistingPaymentIntentVerdict =
	| { action: 'refuse'; reason: string }
	| { action: 'replace'; cancel: boolean }
	| { action: 'reuse' }

export type ExpectedPaymentIntent = {
	amount: number
	connectedAccountId?: string
	currency: string
	customerID: string
	/**
	 * The metadata the new PaymentIntent would carry; `confirmOrder` builds the order from it. Every
	 * key the adapter owns is listed, `undefined` when absent, and only those keys are compared: a
	 * key someone added from the Stripe dashboard is not a reason to replace the payment.
	 */
	metadata: Record<string, number | string | undefined>
}

type ExistingPaymentIntent = Pick<Stripe.PaymentIntent, 'amount' | 'currency' | 'customer' | 'metadata' | 'status' | 'transfer_data'>

const PAYABLE_STATUSES: ReadonlySet<Stripe.PaymentIntent.Status> = new Set(['requires_action', 'requires_confirmation', 'requires_payment_method'])

const MONEY_MOVING_STATUSES: ReadonlySet<Stripe.PaymentIntent.Status> = new Set(['processing', 'requires_capture', 'succeeded'])

const idOf = (value: { id: string } | null | string | undefined): string | undefined => (typeof value === 'string' ? value : (value?.id ?? undefined))

const describesExpectedPayment = (paymentIntent: ExistingPaymentIntent, expected: ExpectedPaymentIntent): boolean => {
	if (paymentIntent.amount !== expected.amount) return false
	if (paymentIntent.currency.toLowerCase() !== expected.currency.toLowerCase()) return false
	if (idOf(paymentIntent.customer) !== expected.customerID) return false
	if (idOf(paymentIntent.transfer_data?.destination) !== expected.connectedAccountId) return false

	// Stripe stores metadata values as strings and drops undefined ones.
	const existingMetadata = paymentIntent.metadata ?? {}
	for (const [key, wanted] of Object.entries(expected.metadata)) {
		if ((existingMetadata[key] ?? undefined) !== (wanted === undefined ? undefined : String(wanted))) return false
	}
	return true
}

/**
 * Decides whether the PaymentIntent already attached to a cart can serve the payment being
 * initiated now. Reusing one only because it is still payable charges the buyer whatever the cart
 * held when it was created: a cart cleared and refilled with a dearer item, as a discovery offer
 * does, would be charged the old amount and turned into an order for the old items.
 */
export const classifyExistingPaymentIntent = (paymentIntent: ExistingPaymentIntent, expected: ExpectedPaymentIntent): ExistingPaymentIntentVerdict => {
	if (MONEY_MOVING_STATUSES.has(paymentIntent.status)) {
		return {
			action: 'refuse',
			reason: `a payment for this cart is already ${paymentIntent.status}`,
		}
	}

	if (paymentIntent.status === 'canceled') {
		return { action: 'replace', cancel: false }
	}

	if (PAYABLE_STATUSES.has(paymentIntent.status)) {
		return describesExpectedPayment(paymentIntent, expected) ? { action: 'reuse' } : { action: 'replace', cancel: true }
	}

	// A status this code does not know cannot be assumed safe to cancel or to overwrite.
	return {
		action: 'refuse',
		reason: `the existing payment for this cart is in an unrecognised status "${paymentIntent.status}"`,
	}
}
