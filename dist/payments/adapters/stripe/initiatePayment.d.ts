import Stripe from 'stripe';
import type { PaymentAdapter } from '../../../types/index.js';
import type { ResolveConnectedAccountFn, StripeAdapterArgs } from './index.js';
type Props = {
    apiVersion?: Stripe.StripeConfig['apiVersion'];
    appInfo?: Stripe.StripeConfig['appInfo'];
    resolveConnectedAccount?: ResolveConnectedAccountFn;
    secretKey: StripeAdapterArgs['secretKey'];
};
export declare const initiatePayment: (props: Props) => NonNullable<PaymentAdapter>['initiatePayment'];
export {};
//# sourceMappingURL=initiatePayment.d.ts.map