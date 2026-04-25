// Quick seed script to populate menu_items and deals tables
// Run with: node scripts/seed-data.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nvqhlcdfvhmgmvhstkgw.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

const menuItems = [
  { id: 's1', name: 'Crispy Chicken Wings', description: 'Golden fried chicken wings with our signature dipping sauce', price: 600, category_id: 'starters', image: '/images/starters.jpg', is_popular: false, rating: 4.6, sort_order: 1 },
  { id: 's2', name: 'Crispy Chicken Tender', description: 'Hand-breaded chicken tenders, crispy and juicy', price: 600, category_id: 'starters', image: '/images/starters.jpg', is_popular: false, rating: 4.5, sort_order: 2 },
  { id: 's3', name: 'Mushroom Cheese Fries', description: 'Loaded fries with sauteed mushrooms and melted cheese', price: 650, category_id: 'starters', image: '/images/fries.jpg', is_popular: false, rating: 4.7, sort_order: 3 },
  { id: 's4', name: 'Jalapeno Fries', description: 'Spicy loaded fries with fresh jalapenos and cheese sauce', price: 600, category_id: 'starters', image: '/images/fries.jpg', is_popular: false, rating: 4.4, sort_order: 4 },
  { id: 's5', name: 'Fries', description: 'Classic golden crispy french fries', price: 300, category_id: 'starters', image: '/images/fries.jpg', is_popular: false, rating: 4.3, sort_order: 5 },
  { id: 's6', name: 'Garlic Mayo Fries', description: 'Crispy fries tossed in house-made garlic mayo', price: 400, category_id: 'starters', image: '/images/fries.jpg', is_popular: false, rating: 4.5, sort_order: 6 },
  { id: 'c1', name: 'Stuffed Chicken', description: 'Stuffed chicken breast with cheese, wrapped in crispy coating', price: 1200, category_id: 'chicken-burgers', image: '/images/chicken-burger.jpg', is_popular: false, rating: 4.8, sort_order: 7 },
  { id: 'c2', name: 'Chicken Jalapeno', description: 'Crispy chicken fillet with fresh jalapenos and spicy sauce', price: 750, category_id: 'chicken-burgers', image: '/images/chicken-burger.jpg', is_popular: true, rating: 4.7, sort_order: 8 },
  { id: 'c3', name: 'Crispy Chicken', description: 'Classic crispy fried chicken burger with fresh toppings', price: 750, category_id: 'chicken-burgers', image: '/images/chicken-burger.jpg', is_popular: false, rating: 4.5, sort_order: 9 },
  { id: 'c4', name: 'Chicken Signature', description: 'Our signature chicken burger with special Fatty Patty sauce', price: 750, category_id: 'chicken-burgers', image: '/images/chicken-burger.jpg', is_popular: false, rating: 4.6, sort_order: 10 },
  { id: 'b1', name: 'All American', description: 'Double smashed patty, American cheese, pickles, onions, special sauce', price: 1150, category_id: 'beef-burgers', image: '/images/beef-burger.jpg', is_popular: true, rating: 4.9, sort_order: 11 },
  { id: 'b2', name: 'Beef Signature', description: 'Our signature smashed beef burger with house sauce', price: 1000, category_id: 'beef-burgers', image: '/images/beef-burger.jpg', is_popular: true, rating: 4.8, sort_order: 12 },
  { id: 'b3', name: 'Beef Jalapeno', description: 'Smashed beef patty loaded with fresh jalapenos and pepper jack', price: 800, category_id: 'beef-burgers', image: '/images/beef-burger.jpg', is_popular: false, rating: 4.6, sort_order: 13 },
  { id: 'b4', name: 'Beef Classic', description: 'The classic smashed burger with cheese, lettuce, and tomato', price: 800, category_id: 'beef-burgers', image: '/images/beef-burger.jpg', is_popular: false, rating: 4.5, sort_order: 14 },
  { id: 'b5', name: 'Classic Wagyu', description: 'Premium wagyu beef patty, truffle mayo, aged cheddar, caramelized onions', price: 2800, category_id: 'beef-burgers', image: '/images/beef-burger.jpg', is_popular: true, rating: 5.0, sort_order: 15 },
  { id: 'b6', name: 'Beef Bacon', description: 'Smashed beef with crispy bacon strips and smoky BBQ sauce', price: 1100, category_id: 'beef-burgers', image: '/images/beef-burger.jpg', is_popular: false, rating: 4.7, sort_order: 16 },
  { id: 'b7', name: 'Red Mushroom', description: 'Beef patty topped with sauteed mushrooms and Swiss cheese', price: 900, category_id: 'beef-burgers', image: '/images/beef-burger.jpg', is_popular: false, rating: 4.6, sort_order: 17 },
  { id: 'bo1', name: 'Moroccan Chicken Bowl', description: 'Spiced Moroccan chicken with rice, roasted veggies and tahini', price: 1200, category_id: 'bowls', image: '/images/bowl.jpg', is_popular: true, rating: 4.8, sort_order: 18 },
  { id: 'bo2', name: 'Korean Chicken Bowl', description: 'Korean style crispy chicken with gochujang sauce and pickled vegetables', price: 1200, category_id: 'bowls', image: '/images/bowl.jpg', is_popular: false, rating: 4.7, sort_order: 19 },
  { id: 'p1', name: 'Alfredo Pasta Bowl', description: 'Creamy Alfredo pasta with grilled chicken and parmesan', price: 1200, category_id: 'pasta', image: '/images/pasta.jpg', is_popular: false, rating: 4.6, sort_order: 20 },
  { id: 'f1', name: 'Fatty Fries', description: 'Our signature loaded fries with double cheese and special toppings', price: 850, category_id: 'fries', image: '/images/fries.jpg', is_popular: true, rating: 4.9, sort_order: 21 },
  { id: 'f2', name: 'Moroccan Fries', description: 'Loaded fries with Moroccan spiced chicken and sauces', price: 850, category_id: 'fries', image: '/images/fries.jpg', is_popular: false, rating: 4.7, sort_order: 22 },
  { id: 'd1', name: 'Mineral Water', description: 'Chilled mineral water bottle', price: 100, category_id: 'drinks', image: '/images/drinks.jpg', is_popular: false, rating: 4.0, sort_order: 23 },
  { id: 'd2', name: 'Cold Drink', description: 'Choice of Pepsi, 7UP, or Mirinda', price: 150, category_id: 'drinks', image: '/images/drinks.jpg', is_popular: false, rating: 4.2, sort_order: 24 },
]

const deals = [
  { id: 'deal-1', name: 'Deal 1', title: 'Classic Crunch Combo', items: ['Crispy Chicken Burger', 'Fries', 'Cold Drink'], price: 1200, image: '/images/chicken-burger.jpg', is_active: true, sort_order: 1 },
  { id: 'deal-2', name: 'Deal 2', title: 'Duo Box', items: ['2x Chicken Burgers', '2x Fries', '2x Cold Drinks'], price: 2000, image: '/images/chicken-burger.jpg', is_active: true, sort_order: 2 },
  { id: 'deal-3', name: 'Deal 3', title: 'Italian Fusion Deal', items: ['Alfredo Pasta', 'Garlic Bread', 'Cold Drink'], price: 1700, image: '/images/pasta.jpg', is_active: true, sort_order: 3 },
  { id: 'deal-4', name: 'Deal 4', title: 'Family Feast Box', items: ['2x Beef Burgers', '2x Chicken Burgers', '4x Fries', '4x Cold Drinks'], price: 2800, image: '/images/beef-burger.jpg', is_active: true, sort_order: 4 },
]

async function seed() {
  console.log('Seeding menu_items...')
  
  // Use upsert to handle existing rows
  const { data: itemsData, error: itemsError } = await supabase
    .from('menu_items')
    .upsert(menuItems, { onConflict: 'id' })
    .select()

  if (itemsError) {
    console.error('Error seeding menu_items:', itemsError)
  } else {
    console.log(`✅ Seeded ${itemsData.length} menu items`)
  }

  console.log('Seeding deals...')
  
  const { data: dealsData, error: dealsError } = await supabase
    .from('deals')
    .upsert(deals, { onConflict: 'id' })
    .select()

  if (dealsError) {
    console.error('Error seeding deals:', dealsError)
  } else {
    console.log(`✅ Seeded ${dealsData.length} deals`)
  }

  // Verify
  const { data: verifyItems } = await supabase.from('menu_items').select('id').limit(100)
  const { data: verifyDeals } = await supabase.from('deals').select('id').limit(100)
  console.log(`\nVerification: ${verifyItems?.length || 0} menu items, ${verifyDeals?.length || 0} deals in DB`)
}

seed().catch(console.error)
