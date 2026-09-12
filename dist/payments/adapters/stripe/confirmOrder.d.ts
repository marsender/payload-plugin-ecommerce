import Stripe from 'stripe';
import type { PaymentAdapter } from '../../../types/index.js';
import type { StripeAdapterArgs } from './index.js';
type Props = {
    apiVersion?: Stripe.StripeConfig['apiVersion'];
    appInfo?: Stripe.StripeConfig['appInfo'];
    secretKey: StripeAdapterArgs['secretKey'];
};
/**
 * The browser's confirmation of a Stripe payment: settles it through `settlePaymentIntent`, which
 * makes it safe to call more than once and at the same time as any other settlement of the same
 * payment — every call after the first returns the order the first one created.
 *
 * **Only the buyer may confirm** (`isTransactionBuyer`), checked under the lock before anything is
 * returned or written. First-confirmation-wins makes this load-bearing: without it, whoever
 * confirmed a leaked PaymentIntent id first would own the order and its credits, and the buyer's
 * own confirmation would then only be handed that stranger's order.
 *
 * It never returns a `transactionID`: the confirm-order endpoint adjusts inventory whenever one is
 * returned, and `settlePaymentIntent` already did so, atomically with the order. A repeat call
 * returns no `accessToken` either.
 */
export declare const confirmOrder: (props: Props) => NonNullable<PaymentAdapter>['confirmOrder'];
export {};
//# sourceMappingURL=confirmOrder.d.ts.map