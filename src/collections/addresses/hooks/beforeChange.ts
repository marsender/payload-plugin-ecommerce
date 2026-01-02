import type { CollectionBeforeChangeHook } from 'payload'

export const beforeChange: CollectionBeforeChangeHook = async ({ data, req }) => {
  // Automatically set the customer field to the current user if not already provided.
  // Admins can override by explicitly providing a customer ID in the request.
  if (req.user && !data.customer) {
    data.customer = req.user.id
  }
}
