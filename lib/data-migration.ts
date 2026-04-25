/**
 * Data Migration Utility
 * Handles migrating legacy storage keys to the new global keys:
 * - menuItems (was products)
 * - deals (was deals)
 * - orders (stays the same)
 */

export function migrateStorageData() {
  if (typeof window === 'undefined') return

  try {
    // Migrate 'products' to 'menuItems' if it exists
    const legacyProducts = localStorage.getItem('products')
    if (legacyProducts && !localStorage.getItem('menuItems')) {
      localStorage.setItem('menuItems', legacyProducts)
      // Don't delete the legacy key yet, keep both for backwards compatibility
    }

    // Ensure deals key exists (no migration needed)
    const deals = localStorage.getItem('deals')
    if (!deals) {
      localStorage.setItem('deals', JSON.stringify([]))
    }

    // Ensure orders key exists (no migration needed)
    const orders = localStorage.getItem('orders')
    if (!orders) {
      localStorage.setItem('orders', JSON.stringify([]))
    }
  } catch (error) {
    console.error('[v0] Error during storage migration:', error)
  }
}

/**
 * Get menu items from correct storage key
 * Checks new key first, then legacy key
 */
export function getMenuItems() {
  try {
    const menuItems = localStorage.getItem('menuItems')
    if (menuItems) {
      return JSON.parse(menuItems)
    }

    // Fallback to legacy key
    const products = localStorage.getItem('products')
    if (products) {
      return JSON.parse(products)
    }

    return []
  } catch (error) {
    console.error('[v0] Error getting menu items:', error)
    return []
  }
}

/**
 * Get deals from storage
 */
export function getDeals() {
  try {
    const deals = localStorage.getItem('deals')
    return deals ? JSON.parse(deals) : []
  } catch (error) {
    console.error('[v0] Error getting deals:', error)
    return []
  }
}

/**
 * Get orders from storage
 */
export function getOrders() {
  try {
    const orders = localStorage.getItem('orders')
    return orders ? JSON.parse(orders) : []
  } catch (error) {
    console.error('[v0] Error getting orders:', error)
    return []
  }
}

/**
 * Get categories from menu items
 * Dynamically generates category list from menu items
 */
export function getCategories() {
  const menuItems = getMenuItems()
  const categorySet = new Set<string>()

  menuItems.forEach((item: any) => {
    if (item.category) {
      categorySet.add(item.category)
    } else if (item.category_id) {
      categorySet.add(item.category_id)
    }
  })

  return Array.from(categorySet).sort()
}
