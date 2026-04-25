# Fatty Patty CMS - Storage Synchronization Guide

## Global Storage Keys

The application uses three global localStorage keys for data synchronization:

### 1. **menuItems**
- **Purpose**: Store all menu items for the customer website
- **Accessed By**:
  - Admin Menu Page: `/admin/menu` (reads/writes)
  - MenuSection Component: `components/menu-section.tsx` (reads)
  - API: `/api/menu` (reads for customer website)
- **Structure**: Array of menu items with category, price, image, etc.
- **Sync Method**: Uses `setStorageWithSync()` utility to trigger events

### 2. **deals**
- **Purpose**: Store all active deals for the customer website
- **Accessed By**:
  - Admin Deals Page: `/admin/deals` (reads/writes)
  - Promotions Component: `components/promotions.tsx` (reads)
  - API: `/api/menu` (reads for customer website)
- **Structure**: Array of deal objects with type, price, image, validity dates
- **Sync Method**: Uses `setStorageWithSync()` utility to trigger events
- **Deal Structure**:
  ```json
  {
    "id": "unique_id",
    "name": "Deal Name",
    "title": "Deal Description",
    "items": [],
    "price": 0,
    "image": "image_url"
  }
  ```

### 3. **orders**
- **Purpose**: Store all customer orders
- **Accessed By**:
  - Admin Orders Page: `/admin/orders` (reads/writes)
  - Checkout Modal: `components/checkout-modal.tsx` (writes)
  - Track Page: `/app/track/page.tsx` (reads)
  - Dashboard: `/admin/page.tsx` (reads and calculates stats)
- **Structure**: Array of order objects with customer info, items, status
- **Sync Method**: Uses `setStorageWithSync()` for status updates

## Data Flow Architecture

### Menu Management Flow
```
Admin Menu Page (edit product)
  ↓
API Call to /api/admin/menu
  ↓
Update state
  ↓
Save to 'menuItems' using setStorageWithSync()
  ↓
Event triggers
  ↓
MenuSection component re-renders
  ↓
Customer sees updated menu
```

### Deals Management Flow
```
Admin Deals Page (create/edit/delete deal)
  ↓
API Call to /api/admin/deals
  ↓
Update state
  ↓
Save to 'deals' using setStorageWithSync()
  ↓
Event triggers
  ↓
Promotions component re-renders
  ↓
Customer sees updated deals
```

### Orders Management Flow
```
Checkout Modal (place order)
  ↓
Save to 'orders' localStorage
  ↓
API call to /api/orders (async, non-blocking)
  ↓
Admin Orders Page displays order
  ↓
Admin updates status
  ↓
Save to 'orders' using setStorageWithSync()
  ↓
Dashboard auto-calculates stats
```

## Key Features

### Automatic Category Generation
Categories are dynamically generated from menu items:
```javascript
const categories = [...new Set(menuItems.map(item => item.category))]
```

### Real-time Synchronization
The `setStorageWithSync()` utility:
- Saves to localStorage
- Manually dispatches storage events
- Enables same-tab synchronization
- Triggers component re-renders

### Dashboard Stats Auto-Calculation
The dashboard calculates stats from orders:
- Today's Revenue: Sum of today's order totals
- Today's Orders: Count of orders created today
- Pending Orders: Count of pending status orders
- Total Orders: Total count of all orders
- Recent Orders: Latest 5 orders sorted by date

### Backward Compatibility
- Legacy 'products' key is still supported
- Data migration from 'products' to 'menuItems' happens automatically
- Both keys are kept for now to prevent data loss

## Storage Utilities

### Migration Utility (`lib/data-migration.ts`)
```javascript
// Run migration on app start
migrateStorageData()

// Get data with fallback to legacy keys
getMenuItems()  // Checks 'menuItems' then 'products'
getDeals()      // Checks 'deals'
getOrders()     // Checks 'orders'
getCategories() // Dynamically generates from menuItems
```

### Sync Utility (`lib/storage-sync.ts`)
```javascript
// Save with event triggering
setStorageWithSync(key, value)
```

## Troubleshooting

### Data Not Syncing Between Tabs
- Check that `setStorageWithSync()` is being used, not `localStorage.setItem()`
- Verify the storage key matches the global key (menuItems, deals, orders)
- Check browser console for errors

### Admin Changes Not Visible on Customer Site
- Ensure admin page uses correct key: menuItems (not products)
- Verify `setStorageWithSync()` is called after data update
- Check that MenuSection/Promotions components are mounted

### Dashboard Stats Not Updating
- Verify orders are saved to 'orders' key
- Check that createdAt/created_at timestamp is present in orders
- Ensure dashboard calls fetchData on interval

## Implementation Checklist

✅ Global storage keys (menuItems, deals, orders)
✅ Admin pages sync to correct keys
✅ Customer components read from correct keys
✅ Storage migration utility
✅ Real-time sync via setStorageWithSync()
✅ Dashboard auto-calculation
✅ Orders tracking
✅ Backward compatibility with legacy keys
