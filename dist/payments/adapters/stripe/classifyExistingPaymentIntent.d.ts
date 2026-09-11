import type { Stripe } from 'stripe';
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
export type ExistingPaymentIntentVerdict = {
    action: 'refuse';
    reason: string;
} | {
    action: 'replace';
    cancel: boolean;
} | {
    action: 'reuse';
};
export type ExpectedPaymentIntent = {
    amount: number;
    connectedAccountId?: string;
    currency: string;
    customerID: string;
    /**
     * The metadata the new PaymentIntent would carry; `confirmOrder` builds the order from it. Every
     * key the adapter owns is listed, `undefined` when absent, and only those keys are compared: a
     * key someone added from the Stripe dashboard is not a reason to replace the payment.
     */
    metadata: Record<string, number | string | undefined>;
};
type ExistingPaymentIntent = Pick<Stripe.PaymentIntent, 'amount' | 'currency' | 'customer' | 'metadata' | 'status' | 'transfer_data'>;
/**
 * Decides whether the PaymentIntent already attached to a cart can serve the payment being
 * initiated now. Reusing one only because it is still payable charges the buyer whatever the cart
 * held when it was created: a cart cleared and refilled with a dearer item, as a discovery offer
 * does, would be charged the old amount and turned into an order for the old items.
 */
export declare const classifyExistingPaymentIntent: (paymentIntent: ExistingPaymentIntent, expected: ExpectedPaymentIntent) => ExistingPaymentIntentVerdict;
export {};
//# sourceMappingURL=classifyExistingPaymentIntent.d.ts.map