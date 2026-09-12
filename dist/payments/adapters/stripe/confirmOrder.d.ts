import Stripe from 'stripe';
import type { PaymentAdapter } from '../../../types/index.js';
import type { StripeAdapterArgs } from './index.js';
type Props = {
    apiVersion?: Stripe.StripeConfig['apiVersion'];
    appInfo?: Stripe.StripeConfig['appInfo'];
    secretKey: StripeAdapterArgs['secretKey'];
};
/**
 * Turns a succeeded PaymentIntent into an order. **Safe to call more than once for the same
 * PaymentIntent**: every call after the first returns the order the first one created.
 *
 * That is not hypothetical. A storefront confirms from the page that took the payment AND from the
 * `return_url` a redirect-based method sends the buyer back to, and on a phone the payment can
 * finish in both at once (the original tab plus the one Stripe returned to). Production saw the two
 * requests 0.4 s apart. Without a guard both find the pending transaction, both create an order,
 * and the buyer is granted everything twice for one charge.
 *
 * So the check and the writes run under `withCartLock`, keyed on the transaction's cart — the same
 * lock `initiatePayment` takes, so a confirmation also waits for an initiation still in flight on
 * that cart. The second caller gets the lock only once the first has committed, and then sees the
 * order it created.
 *
 * A repeat call returns no `transactionID`: the confirm-order endpoint adjusts inventory whenever
 * one is returned, and the first call already did. It returns no `accessToken` either — anyone who
 * has seen the return URL knows the PaymentIntent id, and a replay must not hand them the order.
 */
export declare const confirmOrder: (props: Props) => NonNullable<PaymentAdapter>['confirmOrder'];
export {};
//# sourceMappingURL=confirmOrder.d.ts.map