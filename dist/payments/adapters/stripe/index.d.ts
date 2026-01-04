import type { PayloadRequest } from 'payload';
import type { Stripe } from 'stripe';
import type { PaymentAdapter, PaymentAdapterArgs, PaymentAdapterClient, PaymentAdapterClientArgs } from '../../../types/index.js';
type StripeWebhookHandler = (args: {
    event: Stripe.Event;
    req: PayloadRequest;
    stripe: Stripe;
}) => Promise<void> | void;
type StripeWebhookHandlers = {
    /**
     * Description of the event (e.g., invoice.created or charge.refunded).
     */
    [webhookName: string]: StripeWebhookHandler;
};
/**
 * Arguments for resolving the Stripe Connect account ID from cart data.
 * Used when payments need to be routed to different connected accounts.
 */
export type ResolveConnectedAccountArgs = {
    cart: import('../../../types/index.js').Cart;
    req: PayloadRequest;
};
/**
 * Function type for resolving the Stripe Connect account ID.
 * Should return the connected account ID (e.g., 'acct_1234xyz') or undefined if no connected account should be used.
 */
export type ResolveConnectedAccountFn = (args: ResolveConnectedAccountArgs) => Promise<string | undefined> | string | undefined;
export type StripeAdapterArgs = {
    /**
     * This library's types only reflect the latest API version.
     *
     * We recommend upgrading your account's API Version to the latest version
     * if you wish to use TypeScript with this library.
     *
     * If you wish to remain on your account's default API version,
     * you may pass `null` or another version instead of the latest version,
     * and add a `@ts-ignore` comment here and anywhere the types differ between API versions.
     *
     * @docs https://stripe.com/docs/api/versioning
     */
    apiVersion?: Stripe.StripeConfig['apiVersion'];
    appInfo?: Stripe.StripeConfig['appInfo'];
    publishableKey: string;
    secretKey: string;
    webhooks?: StripeWebhookHandlers;
    webhookSecret?: string;
    /**
     * Optional function to resolve the Stripe Connect account ID from the cart.
     * When provided, payments will be routed to the connected account using `transfer_data`.
     * This is useful for marketplace scenarios where different sellers/coaches have their own Stripe accounts.
     *
     * @example
     * ```ts
     * resolveConnectedAccount: async ({ cart, req }) => {
     *   // Get the first product's coach and return their Stripe Connect account ID
     *   const product = await req.payload.findByID({
     *     collection: 'products',
     *     id: cart.items[0].product,
     *     depth: 1,
     *   })
     *   return product.coach?.stripeConnectAccountId
     * }
     * ```
     */
    resolveConnectedAccount?: ResolveConnectedAccountFn;
} & PaymentAdapterArgs;
export declare const stripeAdapter: (props: StripeAdapterArgs) => PaymentAdapter;
export type StripeAdapterClientArgs = {
    /**
     * This library's types only reflect the latest API version.
     *
     * We recommend upgrading your account's API Version to the latest version
     * if you wish to use TypeScript with this library.
     *
     * If you wish to remain on your account's default API version,
     * you may pass `null` or another version instead of the latest version,
     * and add a `@ts-ignore` comment here and anywhere the types differ between API versions.
     *
     * @docs https://stripe.com/docs/api/versioning
     */
    apiVersion?: Stripe.StripeConfig['apiVersion'];
    appInfo?: Stripe.StripeConfig['appInfo'];
    publishableKey: string;
} & PaymentAdapterClientArgs;
export declare const stripeAdapterClient: (props: StripeAdapterClientArgs) => PaymentAdapterClient;
export type InitiatePaymentReturnType = {
    clientSecret: string;
    message: string;
    paymentIntentID: string;
};
export {};
//# sourceMappingURL=index.d.ts.map