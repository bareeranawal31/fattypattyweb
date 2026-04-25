# Fatty Patty CMS - Data Sync Test Scenarios

## Pre-test Setup
1. Clear all browser localStorage: `localStorage.clear()`
2. Refresh the app
3. StorageInit component should initialize all keys

## Test Scenario 1: Menu Item Management

### Test 1.1: Add Menu Item
**Steps:**
1. Go to Admin → Menu
2. Click "Add Product"
3. Fill in form (name, price, category, image URL)
4. Click "Create"
5. Go to Customer Menu page

**Expected Result:**
- Product appears in admin list immediately
- Product appears on customer menu within 30 seconds
- Product groupd under correct category
- LocalStorage 'menuItems' key contains the new product

**Verification:**
```javascript
// In console on menu page
JSON.parse(localStorage.getItem('menuItems')).find(item => item.name === "Your Product Name")
```

### Test 1.2: Edit Menu Item
**Steps:**
1. Go to Admin → Menu
2. Click edit on any product
3. Change price or description
4. Click "Update"
5. Go to Customer Menu

**Expected Result:**
- Price/description updated on customer menu
- Change visible within seconds
- 'menuItems' localStorage updated

### Test 1.3: Delete Menu Item
**Steps:**
1. Go to Admin → Menu
2. Click delete on a product
3. Confirm deletion
4. Go to Customer Menu

**Expected Result:**
- Product removed from customer menu
- Product removed from 'menuItems' localStorage
- Category still shows if other items exist

### Test 1.4: Toggle Product Availability
**Steps:**
1. Go to Admin → Menu
2. Toggle availability on a product
3. Check Customer Menu immediately

**Expected Result:**
- Available items show on customer menu
- Unavailable items hidden
- Change syncs immediately

---

## Test Scenario 2: Deal Management

### Test 2.1: Create Deal
**Steps:**
1. Go to Admin → Deals
2. Click "Add Deal"
3. Fill form (name, type, price/discount, dates)
4. Click "Create"
5. Go to home page - check Deals section

**Expected Result:**
- Deal shows on home page deals section
- Deal appears in 'deals' localStorage
- Deal visible on customer site

### Test 2.2: Edit Deal
**Steps:**
1. Go to Admin → Deals
2. Click edit on a deal
3. Change description or price
4. Click "Update"
5. Check home page deals

**Expected Result:**
- Deal updated on home page
- Change syncs to customer site
- 'deals' localStorage reflects changes

### Test 2.3: Toggle Deal Status
**Steps:**
1. Go to Admin → Deals
2. Toggle active/inactive on a deal
3. Check home page deals

**Expected Result:**
- Active deals show on home page
- Inactive deals hidden
- Change reflects immediately

---

## Test Scenario 3: Order Management

### Test 3.1: Place Order
**Steps:**
1. Go to Menu page
2. Add items to cart
3. Click Checkout
4. Fill order details
5. Click Place Order
6. Go to Admin → Dashboard

**Expected Result:**
- Order appears in admin Dashboard
- Order shows in "Recent Orders"
- Order count increases
- Order appears in 'orders' localStorage

**Verification:**
```javascript
JSON.parse(localStorage.getItem('orders')).find(order => order.order_number === "FP-...")
```

### Test 3.2: Track Order
**Steps:**
1. Place an order (previous test)
2. Go to Track Order page
3. Enter order number and phone
4. Click Search

**Expected Result:**
- Order found and displayed
- Status shows correctly
- Can see order items and total

### Test 3.3: Update Order Status
**Steps:**
1. Go to Admin → Orders
2. Select an order
3. Click status dropdown
4. Change to "Preparing"
5. Go back to Dashboard

**Expected Result:**
- Order status updated in admin
- Dashboard stats update (pending count decreases)
- Status change syncs to orders localStorage
- Customer tracking page shows updated status

---

## Test Scenario 4: Dashboard Auto-Calculation

### Test 4.1: Today's Revenue
**Steps:**
1. Create orders with known totals
2. Go to Admin → Dashboard
3. Check "Today's Revenue"

**Expected Result:**
- Revenue = sum of today's order totals
- Updates when new orders placed
- Shows in correct currency format (Rs.)

### Test 4.2: Today's Orders Count
**Steps:**
1. Place multiple orders (same day)
2. Check Dashboard

**Expected Result:**
- Count shows correct number of orders
- Only counts orders from today
- Updates in real-time

### Test 4.3: Pending Orders Count
**Steps:**
1. Place order (status = Pending)
2. Update another order to "Preparing"
3. Check Dashboard

**Expected Result:**
- Pending count = number of "Pending" orders
- Updates when status changes
- Accurate count

---

## Test Scenario 5: Real-time Synchronization

### Test 5.1: Same Tab Sync
**Steps:**
1. Open Admin Menu in one window
2. Edit a product and save
3. Immediately switch to Customer Menu (same window)
4. Menu should update without page reload

**Expected Result:**
- Menu updates immediately
- No manual refresh needed
- Storage event triggers component re-render

### Test 5.2: Cross-Tab Sync
**Steps:**
1. Open Admin Menu in Tab A
2. Open Customer Menu in Tab B
3. Edit product in Tab A and save
4. Switch to Tab B

**Expected Result:**
- Tab B menu updates automatically
- Both tabs show same data
- Demonstrates cross-tab storage events work

### Test 5.3: Backward Compatibility
**Steps:**
1. Manually set localStorage 'products' key with old format
2. Open Admin Menu
3. Reload page

**Expected Result:**
- Old data migrates to 'menuItems'
- Both keys available for reading
- No data loss

---

## Test Scenario 6: Categories

### Test 6.1: Automatic Category Generation
**Steps:**
1. Add menu items in different categories
2. Go to Admin Menu
3. Check category dropdown

**Expected Result:**
- Categories show without manual setup
- Categories auto-generated from items
- New category appears when item added to it

### Test 6.2: Category Management
**Steps:**
1. Go to Admin → Categories (if page exists)
2. Add/edit category
3. Add items to that category

**Expected Result:**
- Categories properly managed
- Items can be assigned to categories
- Customer menu groups by category

---

## Test Scenario 7: Error Handling

### Test 7.1: API Failure - Menu Fallback
**Steps:**
1. Disconnect internet or block API
2. Refresh Customer Menu page
3. Page should still load

**Expected Result:**
- Menu loads from localStorage
- Shows cached data if available
- Graceful degradation

### Test 7.2: Clear StorageRecovery
**Steps:**
1. Clear localStorage manually
2. Refresh pages

**Expected Result:**
- App initializes empty storage
- Can still add/create items
- New data syncs to storage

---

## Performance Tests

### Test P1: Page Load Time
**Steps:**
1. Clear browser cache
2. Measure page load time for Customer Menu

**Expected Result:**
- Load time < 2 seconds
- Storage lookup is fast

### Test P2: Storage Size
**Steps:**
1. Check localStorage usage
2. Check total size of menuItems + deals + orders

**Expected Result:**
- menuItems: ~10-50KB depending on items
- deals: ~5-20KB
- orders: Grows over time, reasonable for usage

---

## Cleanup After Tests
1. Clear test orders: `localStorage.removeItem('orders')`
2. Clear test data: `localStorage.clear()`
3. StorageInit will reinitialize on next page load
