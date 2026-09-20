/**
 * Stable machine-readable causes, returned as `cause.code` on an error response body.
 *
 * A consumer app is internationalised and this package is not, so an endpoint must never make its
 * English sentence the thing a caller has to act on: the message is for a log, the code is the
 * contract. Add a code here rather than asking anyone to compare prose.
 */
export const GuestCheckoutDisabled = 'GuestCheckoutDisabled'
export const MissingPrice = 'MissingPrice'
export const OutOfStock = 'OutOfStock'
