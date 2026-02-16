export const deleteVariantsAfterProductDelete = ({ variantsSlug })=>async ({ id, req })=>{
        const { docs: variants } = await req.payload.find({
            collection: variantsSlug,
            depth: 0,
            limit: 0,
            req,
            where: {
                product: {
                    equals: id
                }
            }
        });
        await Promise.all(variants.map((variant)=>req.payload.delete({
                id: variant.id,
                collection: variantsSlug,
                req
            })));
    };

//# sourceMappingURL=afterDelete.js.map