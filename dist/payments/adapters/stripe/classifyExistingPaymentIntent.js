const PAYABLE_STATUSES = new Set([
    'requires_action',
    'requires_confirmation',
    'requires_payment_method'
]);
const MONEY_MOVING_STATUSES = new Set([
    'processing',
    'requires_capture',
    'succeeded'
]);
const idOf = (value)=>typeof value === 'string' ? value : value?.id ?? undefined;
const describesExpectedPayment = (paymentIntent, expected)=>{
    if (paymentIntent.amount !== expected.amount) return false;
    if (paymentIntent.currency.toLowerCase() !== expected.currency.toLowerCase()) return false;
    if (idOf(paymentIntent.customer) !== expected.customerID) return false;
    if (idOf(paymentIntent.transfer_data?.destination) !== expected.connectedAccountId) return false;
    // Stripe stores metadata values as strings and drops undefined ones.
    const existingMetadata = paymentIntent.metadata ?? {};
    for (const [key, wanted] of Object.entries(expected.metadata)){
        if ((existingMetadata[key] ?? undefined) !== (wanted === undefined ? undefined : String(wanted))) return false;
    }
    return true;
};
/**
 * Decides whether the PaymentIntent already attached to a cart can serve the payment being
 * initiated now. Reusing one only because it is still payable charges the buyer whatever the cart
 * held when it was created: a cart cleared and refilled with a dearer item, as a discovery offer
 * does, would be charged the old amount and turned into an order for the old items.
 */ export const classifyExistingPaymentIntent = (paymentIntent, expected)=>{
    if (MONEY_MOVING_STATUSES.has(paymentIntent.status)) {
        return {
            action: 'refuse',
            reason: `a payment for this cart is already ${paymentIntent.status}`
        };
    }
    if (paymentIntent.status === 'canceled') {
        return {
            action: 'replace',
            cancel: false
        };
    }
    if (PAYABLE_STATUSES.has(paymentIntent.status)) {
        return describesExpectedPayment(paymentIntent, expected) ? {
            action: 'reuse'
        } : {
            action: 'replace',
            cancel: true
        };
    }
    // A status this code does not know cannot be assumed safe to cancel or to overwrite.
    return {
        action: 'refuse',
        reason: `the existing payment for this cart is in an unrecognised status "${paymentIntent.status}"`
    };
};

//# sourceMappingURL=classifyExistingPaymentIntent.js.map