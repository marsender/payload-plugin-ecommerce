import type { CollectionBeforeChangeHook } from 'payload'

import type { CurrenciesConfig } from '../../types/index.js'

import { toID } from '../../utilities/tenantFilterOptions.js'

type Props = {
  currenciesConfig?: CurrenciesConfig
  productsSlug: string
  variantsSlug: string
}

/**
 * Fills a BLANK `amount` from the order's own lines, the way `beforeChangeCart` fills a cart's
 * subtotal.
 *
 * Only a blank one, and that restriction is the whole design. An order's amount is what was
 * actually charged — after a coupon, and as the payment provider recorded it — so recomputing it
 * on a later save would quietly restate a receipt from today's catalogue prices. An order typed in
 * by hand is what this exists for: its lines are known, and the total is arithmetic nobody should
 * have to do twice.
 *
 * A line whose price cannot be read abandons the whole computation rather than contributing
 * nothing to it: an amount left empty is visible to whoever is entering the order, a total that is
 * silently short by one line is not.
 */
export const beforeChangeOrder: (args: Props) => CollectionBeforeChangeHook =
  ({ currenciesConfig, productsSlug, variantsSlug }) =>
  async ({ data, req }) => {
    if (!currenciesConfig || typeof data.amount === 'number') {
      return data
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return data
    }

    const currency =
      data.currency ??
      currenciesConfig.defaultCurrency ??
      currenciesConfig.supportedCurrencies[0]?.code
    if (!currency) {
      return data
    }

    const priceField = `priceIn${String(currency).toUpperCase()}`
    let amount = 0

    for (const item of data.items) {
      const quantity = typeof item?.quantity === 'number' && item.quantity > 0 ? item.quantity : 1
      const variantID = toID(item?.variant)
      const productID = toID(item?.product)

      const source = variantID !== null
        ? { collection: variantsSlug, id: variantID }
        : productID !== null
          ? { collection: productsSlug, id: productID }
          : null

      if (!source) {
        req.payload.logger.warn('[order] Cannot price a line with no product: amount left unset')
        return data
      }

      let price: unknown
      try {
        const doc = await req.payload.findByID({
          id: source.id,
          collection: source.collection as 'products',
          depth: 0,
          req,
          select: { [priceField]: true },
        })
        price = (doc as Record<string, unknown>)?.[priceField]
      } catch {
        price = undefined
      }

      if (typeof price !== 'number') {
        req.payload.logger.warn(
          `[order] No ${priceField} on ${source.collection} ${source.id}: amount left unset`,
        )
        return data
      }

      amount += price * quantity
    }

    data.amount = amount

    return data
  }
