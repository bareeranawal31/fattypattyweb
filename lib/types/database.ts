// Database types for Fatty Patty Food App

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  display_order: number
  preparation_time_minutes: number | null
  calories: number | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface Deal {
  id: string
  name: string
  description: string | null
  deal_type: 'combo' | 'discount' | 'bogo' | 'bundle'
  discount_percentage: number | null
  discount_amount: number | null
  fixed_price: number | null
  min_items: number | null
  max_items: number | null
  valid_from: string
  valid_until: string | null
  is_active: boolean
  image_url: string | null
  terms_conditions: string | null
  created_at: string
}

export interface DealItem {
  id: string
  deal_id: string
  menu_item_id: string | null
  category_id: string | null
  quantity: number
  is_required: boolean
  selection_group: string | null
  menu_item?: MenuItem
  category?: Category
}

export interface AddOn {
  id: string
  name: string
  price: number
  category: string
  is_available: boolean
}

export interface DrinkOption {
  id: string
  name: string
  size: string
  price: number
  is_available: boolean
}

export interface Branch {
  id: string
  name: string
  address: string
  city: string
  phone: string | null
  opening_time: string
  closing_time: string
  is_active: boolean
  accepts_pickup: boolean
  accepts_delivery: boolean
  latitude: number | null
  longitude: number | null
  delivery_radius: number | null
}

export interface DeliveryArea {
  id: string
  branch_id: string
  area_name: string
  delivery_fee: number
  min_order_amount: number
  estimated_time_minutes: number
  is_active: boolean
  polygon_coordinates: Array<{ lat: number; lng: number }> | null
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'picked_up' | 'cancelled'
export type OrderType = 'delivery' | 'pickup'
export type PaymentMethod = 'cash' | 'card' | 'online'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  order_type: OrderType
  status: OrderStatus
  branch_id: string | null
  delivery_address: string | null
  delivery_area_id: string | null
  delivery_fee: number
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  special_instructions: string | null
  estimated_ready_time: string | null
  actual_ready_time: string | null
  created_at: string
  updated_at: string
  branch?: Branch
  items?: OrderItem[]
  status_history?: OrderStatusHistory[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  deal_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  customizations: Record<string, any> | null
  special_instructions: string | null
  menu_item?: MenuItem
  deal?: Deal
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: OrderStatus
  notes: string | null
  changed_by: string | null
  created_at: string
}

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: 'super_admin' | 'admin' | 'manager'
  branch_id: string | null
  is_active: boolean
  created_at: string
  last_login: string | null
}

// Cart types for client-side use
export interface CartItem {
  id: string
  type: 'menu_item' | 'deal'
  menuItem?: MenuItem
  deal?: Deal
  dealSelections?: DealSelection[]
  quantity: number
  customizations?: {
    addOns?: AddOn[]
    drinkOption?: DrinkOption
    specialInstructions?: string
  }
  unitPrice: number
  totalPrice: number
}

export interface DealSelection {
  group: string
  menuItem: MenuItem
  quantity: number
}

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface MenuData {
  categories: Category[]
  items: MenuItem[]
  deals: Deal[]
  addOns: AddOn[]
  drinkOptions: DrinkOption[]
}
