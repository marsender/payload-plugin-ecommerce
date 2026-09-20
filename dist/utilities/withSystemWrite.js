/**
 * Runs `fn` with `req` temporarily presented as a trusted server-side write, then restores it.
 *
 * Since Payload 3.90, `@payloadcms/plugin-multi-tenant` refuses any write that assigns a tenant
 * the acting user is not a member of, exempting only an all-tenants user or a **userless Local
 * API** write. Settling a payment is neither: a Payload endpoint handler is given
 * `payloadAPI: 'REST'`, and the caller is either nobody (a webhook — a payment provider is not a
 * user) or the buyer, who may deliberately not belong to the tenant they are buying from. A host
 * application that lets a customer of one store buy from another without enrolling them there
 * would have the order refused on its `tenant` field, after the card was charged.
 *
 * Marking the settlement is faithful to what it already is: the order is built from what the
 * transaction and the PaymentIntent recorded, never from the caller, and the caller's right to
 * settle at all was checked by `authorize` before this point.
 *
 * **One request object, mutated and restored, rather than a copy.** The writes must stay inside
 * the cart lock's transaction, which lives on `req.transactionID`; `createLocalReq` mutates the
 * request it is handed rather than copying it, and `payload.create({ user: null })` cannot clear
 * a user (`user || req.user`). The swap is awaited end to end, so nothing else observes the
 * request mid-call.
 */ export const withSystemWrite = async (req, fn)=>{
    const { payloadAPI, user } = req;
    req.payloadAPI = 'local';
    req.user = null;
    try {
        return await fn();
    } finally{
        req.payloadAPI = payloadAPI;
        req.user = user;
    }
};

//# sourceMappingURL=withSystemWrite.js.map