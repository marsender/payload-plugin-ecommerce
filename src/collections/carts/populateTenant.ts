import type { CollectionBeforeChangeHook } from 'payload'

import { parseCookies } from 'payload'

type Props = {
  tenantsSlug: string
}

/**
 * Populates the tenant field from request cookies.
 * This handles both:
 * - Creating carts with tenant from the domain (frontend via payload-tenant-domain cookie)
 * - Admin panel operations (via payload-tenant cookie)
 *
 * The hook only runs on create operations and only if tenant is not already set.
 */
export const populateTenant: (props: Props) => CollectionBeforeChangeHook =
  ({ tenantsSlug }) =>
  async ({ data, operation, req }) => {
    // Only populate on create, and only if tenant not already set
    if (operation !== 'create' || data.tenant) {
      return data
    }

    const cookies = parseCookies(req.headers)

    // Try to get tenant from payload-tenant cookie (admin panel / plugin standard)
    const tenantIdFromCookie = cookies.get('payload-tenant')

    if (tenantIdFromCookie) {
      // Validate the tenant exists
      const tenantExists = await req.payload.count({
        collection: tenantsSlug,
        where: { id: { equals: tenantIdFromCookie } },
      })

      if (tenantExists.totalDocs > 0) {
        data.tenant = tenantIdFromCookie
        return data
      }
    }

    // Try to get tenant from payload-tenant-domain cookie (frontend domain-based)
    const tenantDomain = cookies.get('payload-tenant-domain')

    if (tenantDomain) {
      const tenants = await req.payload.find({
        collection: tenantsSlug,
        where: { domain: { equals: tenantDomain } },
        limit: 1,
      })

      if (tenants.docs.length > 0) {
        data.tenant = tenants.docs[0].id
      }
    }

    return data
  }
