import Stripe from 'stripe';
export const webhooksEndpoint = (props)=>{
    const { apiVersion, appInfo, secretKey, webhooks, webhookSecret } = props || {};
    const handler = async (req)=>{
        // 1. Resolve & guard secret key — missing key is a configuration error
        let resolvedSecretKey = secretKey;
        if (typeof secretKey === 'function') {
            resolvedSecretKey = await secretKey({
                req
            });
        }
        if (!resolvedSecretKey) {
            req.payload.logger.error('Stripe webhook: secret key not configured for tenant');
            return Response.json({
                received: false
            }, {
                status: 500
            });
        }
        // 2. Resolve & guard webhook secret — missing secret is a configuration error
        let resolvedWebhookSecret = webhookSecret;
        if (typeof webhookSecret === 'function') {
            resolvedWebhookSecret = await webhookSecret({
                req
            });
        }
        if (!resolvedWebhookSecret) {
            req.payload.logger.error('Stripe webhook: webhook secret not configured for tenant');
            return Response.json({
                received: false
            }, {
                status: 500
            });
        }
        // 3. Guard stripe-signature header — missing header means the request is not from Stripe
        const stripeSignature = req.headers.get('stripe-signature');
        if (!stripeSignature) {
            req.payload.logger.warn('Stripe webhook: missing stripe-signature header — request rejected');
            return Response.json({
                received: false
            }, {
                status: 400
            });
        }
        const stripe = new Stripe(resolvedSecretKey, {
            // API version can only be the latest, stripe recommends ts ignoring it
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - ignoring since possible versions are not type safe, only the latest version is recognised
            apiVersion: apiVersion || '2025-09-30.clover',
            appInfo: appInfo || {
                name: 'Stripe Payload Plugin',
                url: 'https://payloadcms.com'
            }
        });
        // 4. Read raw body and verify signature (constructEvent enforces 5-min replay window)
        if (!req.text) {
            req.payload.logger.error('Stripe webhook: request body reader unavailable');
            return Response.json({
                received: false
            }, {
                status: 500
            });
        }
        const body = await req.text();
        let event;
        try {
            event = stripe.webhooks.constructEvent(body, stripeSignature, resolvedWebhookSecret);
        } catch (err) {
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            req.payload.logger.error(`Stripe webhook: signature verification failed: ${msg}`);
            return Response.json({
                received: false
            }, {
                status: 400
            });
        }
        // 5. Dispatch to registered handlers
        if (typeof webhooks === 'object' && event) {
            const webhookEventHandler = webhooks[event.type];
            if (typeof webhookEventHandler === 'function') {
                await webhookEventHandler({
                    event,
                    req,
                    stripe
                });
            }
        }
        return Response.json({
            received: true
        }, {
            status: 200
        });
    };
    return {
        handler,
        method: 'post',
        path: '/webhooks'
    };
};

//# sourceMappingURL=webhooks.js.map