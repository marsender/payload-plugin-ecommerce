import crypto from 'crypto';
export const beforeChangeCart = ({ productsSlug, variantsSlug })=>async ({ data, operation, req })=>{
        // Generate a secret for guest cart access on creation
        if (operation === 'create' && !data.customer && !data.secret) {
            // Generate a cryptographically secure random string
            const secret = crypto.randomBytes(20).toString('hex');
            data.secret = secret;
            // Store in context so afterRead hook can include it in the creation response
            if (!req.context) {
                req.context = {};
            }
            req.context.newCartSecret = secret;
        }
        // Update subtotal based on items in the cart
        if (data.items && Array.isArray(data.items)) {
            const priceField = `priceIn${data.currency}`;
            let subtotal = 0;
            const filteredItems = [];
            for (const item of data.items){
                if (item.variant) {
                    const id = typeof item.variant === 'object' ? item.variant.id : item.variant;
                    const variant = await req.payload.findByID({
                        id,
                        collection: variantsSlug,
                        depth: 0,
                        select: {
                            [priceField]: true
                        }
                    });
                    filteredItems.push(item);
                    subtotal += variant[priceField] * item.quantity;
                } else {
                    const id = typeof item.product === 'object' ? item.product.id : item.product;
                    const product = await req.payload.findByID({
                        id,
                        collection: productsSlug,
                        depth: 0,
                        select: {
                            billingInterval: true,
                            [priceField]: true
                        }
                    });
                    // Silently exclude recurring subscription products — they use the SubscribeModal flow
                    if (product.billingInterval && product.billingInterval !== 'none') {
                        req.payload.logger.info(`[cart] Skipping recurring product ${id} (billingInterval: ${product.billingInterval})`);
                        continue;
                    }
                    filteredItems.push(item);
                    subtotal += product[priceField] * item.quantity;
                }
            }
            data.items = filteredItems;
            data.subtotal = subtotal;
        } else {
            data.subtotal = 0;
        }
    };

//# sourceMappingURL=beforeChange.js.map