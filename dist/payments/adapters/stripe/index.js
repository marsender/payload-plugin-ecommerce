import { confirmOrder } from './confirmOrder.js';
import { webhooksEndpoint } from './endpoints/webhooks.js';
import { initiatePayment } from './initiatePayment.js';
export const stripeAdapter = (props)=>{
    const { apiVersion, appInfo, groupOverrides, resolveConnectedAccount, secretKey, webhooks, webhookSecret } = props;
    const label = props?.label || 'Stripe';
    const baseFields = [
        {
            name: 'customerID',
            type: 'text',
            label: 'Stripe Customer ID'
        },
        {
            name: 'paymentIntentID',
            type: 'text',
            label: 'Stripe PaymentIntent ID'
        },
        {
            name: 'connectedAccountId',
            type: 'text',
            label: 'Stripe Connected Account ID',
            admin: {
                description: 'The Stripe Connected Account ID that received this payment (for Stripe Connect)'
            }
        }
    ];
    const groupField = {
        name: 'stripe',
        type: 'group',
        ...groupOverrides,
        admin: {
            condition: (data)=>{
                const path = 'paymentMethod';
                return data?.[path] === 'stripe';
            },
            ...groupOverrides?.admin
        },
        fields: groupOverrides?.fields && typeof groupOverrides?.fields === 'function' ? groupOverrides.fields({
            defaultFields: baseFields
        }) : baseFields
    };
    return {
        name: 'stripe',
        confirmOrder: confirmOrder({
            apiVersion,
            appInfo,
            secretKey
        }),
        endpoints: [
            webhooksEndpoint({
                apiVersion,
                appInfo,
                secretKey,
                webhooks,
                webhookSecret
            })
        ],
        group: groupField,
        initiatePayment: initiatePayment({
            apiVersion,
            appInfo,
            resolveConnectedAccount,
            secretKey
        }),
        label
    };
};
export const stripeAdapterClient = (props)=>{
    return {
        name: 'stripe',
        confirmOrder: true,
        initiatePayment: true,
        label: 'Card'
    };
};

//# sourceMappingURL=index.js.map