export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  popular?: boolean
  rating: number
  isDeal?: boolean
  dealItems?: string[]
}

export interface Category {
  id: string
  name: string
  image: string
  count: number
}

export interface AddOn {
  id: string
  name: string
  price: number
}

export interface DrinkOption {
  id: string
  name: string
}

export const drinkOptions: DrinkOption[] = [
  { id: 'pepsi', name: 'Pepsi' },
  { id: '7up', name: '7UP' },
  { id: 'mirinda', name: 'Mirinda' },
]

// Burger-specific customization options
export const burgerCustomizations: AddOn[] = [
  { id: 'single-patty', name: 'Single Patty', price: 0 },
  { id: 'double-patty', name: 'Double Patty', price: 350 },
  { id: 'extra-cheese', name: 'Extra Cheese', price: 100 },
  { id: 'extra-sauce', name: 'Extra Sauce', price: 50 },
  { id: 'add-fries', name: 'Fries', price: 300 },
  { id: 'add-cold-drink', name: 'Cold Drink', price: 150 },
]

// For bowls, tenders, starters: only cold drink add-on
export const basicAddOns: AddOn[] = [
  { id: 'add-cold-drink', name: 'Cold Drink', price: 150 },
]

export const categories: Category[] = [
  { id: 'starters', name: 'Starters', image: '/images/chicken-wings.jpeg', count: 6 },
  { id: 'chicken-burgers', name: 'Chicken Burgers', image: '/images/chicken-signature-burger.jpeg', count: 4 },
  { id: 'beef-burgers', name: 'Beef Burgers', image: '/images/beef-classic-burger.jpeg', count: 7 },
  { id: 'bowls', name: 'Bowls', image: '/images/korean-chicken-bowl.jpeg', count: 2 },
  { id: 'pasta', name: 'Pasta', image: '/images/alfredo-pasta.jpeg', count: 1 },
  { id: 'fries', name: 'Fries Specials', image: '/images/fatty-fries.jpeg', count: 2 },
  { id: 'drinks', name: 'Drinks', image: '/images/cold-drink.jpeg', count: 2 },
  { id: 'extras', name: 'Extras', image: '/images/mushroom-cheese-fries-2.jpeg', count: 5 },
  { id: 'meal-upgrade', name: 'Meal Upgrade', image: '/images/salted-fries.jpeg', count: 1 },
]

export const menuItems: MenuItem[] = [
  // Starters
  { id: 's1', name: 'Crispy Chicken Wings', description: 'Crispy golden chicken wings with signature seasoning', price: 600, category: 'starters', image: '/images/chicken-wings.jpeg', rating: 4.6 },
  { id: 's2', name: 'Crispy Chicken Tender', description: 'Crispy chicken tenders served with dipping sauce', price: 600, category: 'starters', image: '/images/chicken-tenders.jpeg', rating: 4.5 },
  { id: 's3', name: 'Mushroom Cheese Fries', description: 'Loaded fries with mushroom and melted cheese', price: 650, category: 'starters', image: '/images/mushroom-cheese-fries.jpeg', rating: 4.7 },
  { id: 's4', name: 'Jalapeño Fries', description: 'Crispy fries topped with spicy jalapeños', price: 600, category: 'starters', image: '/images/jalapeno-fries.jpeg', rating: 4.4 },
  { id: 's5', name: 'Fries', description: 'Classic salted fries', price: 300, category: 'starters', image: '/images/salted-fries.jpeg', rating: 4.3 },
  { id: 's6', name: 'Garlic Mayo Fries', description: 'Fries with creamy garlic mayo sauce', price: 400, category: 'starters', image: '/images/garlic-mayo-fries.jpeg', rating: 4.5 },

  // Chicken Burgers
  { id: 'c1', name: 'Stuffed Chicken', description: 'Premium stuffed chicken burger', price: 1200, category: 'chicken-burgers', image: '/images/stuffed-chicken-burger.jpeg', rating: 4.8 },
  { id: 'c2', name: 'Chicken Jalapeño', description: 'Spicy chicken burger with jalapeños', price: 750, category: 'chicken-burgers', image: '/images/chicken-jalapeno-burger.jpeg', popular: true, rating: 4.7 },
  { id: 'c3', name: 'Crispy Chicken', description: 'Classic crispy fried chicken burger', price: 750, category: 'chicken-burgers', image: '/images/chicken-crispy-burger.jpeg', rating: 4.5 },
  { id: 'c4', name: 'Chicken Signature', description: 'Our signature chicken burger with special Fatty Patty sauce', price: 750, category: 'chicken-burgers', image: '/images/chicken-signature-burger.jpeg', rating: 4.6 },

  // Beef Burgers
  { id: 'b1', name: 'All American', description: 'Classic All American beef burger', price: 1150, category: 'beef-burgers', image: '/images/all-american-burger.jpeg', popular: true, rating: 4.9 },
  { id: 'b2', name: 'Beef Signature', description: 'Signature beef burger with special sauce', price: 1000, category: 'beef-burgers', image: '/images/beef-signature-burger.jpeg', popular: true, rating: 4.8 },
  { id: 'b3', name: 'Beef Jalapeño', description: 'Spicy beef burger with jalapeños', price: 800, category: 'beef-burgers', image: '/images/beef-jalapeno-burger.jpeg', rating: 4.6 },
  { id: 'b4', name: 'Beef Classic', description: 'Classic beef burger with cheese, lettuce, and tomato', price: 800, category: 'beef-burgers', image: '/images/beef-classic-burger.jpeg', rating: 4.5 },
  { id: 'b5', name: 'Classic Wagyu', description: 'Premium wagyu beef burger with truffle mayo', price: 2800, category: 'beef-burgers', image: '/images/chicken-wagyu-burger.jpeg', popular: true, rating: 5.0 },
  { id: 'b6', name: 'Beef Bacon', description: 'Beef burger with crispy bacon and smoky BBQ sauce', price: 1100, category: 'beef-burgers', image: '/images/beef-bacon-burger.jpeg', rating: 4.7 },
  { id: 'b7', name: 'Red Mushroom', description: 'Beef burger with mushroom sauce and Swiss cheese', price: 900, category: 'beef-burgers', image: '/images/red-mushroom-burger.jpeg', rating: 4.6 },

  // Bowls
  { id: 'bo1', name: 'Moroccan Chicken Bowl', description: 'Moroccan spiced chicken rice bowl', price: 1200, category: 'bowls', image: '/images/moroccan-chicken-bowl.jpeg', popular: true, rating: 4.8 },
  { id: 'bo2', name: 'Korean Chicken Bowl', description: 'Korean style chicken rice bowl', price: 1200, category: 'bowls', image: '/images/korean-chicken-bowl.jpeg', rating: 4.7 },

  // Pasta
  { id: 'p1', name: 'Alfredo Pasta Bowl', description: 'Creamy alfredo pasta bowl', price: 1200, category: 'pasta', image: '/images/alfredo-pasta.jpeg', rating: 4.6 },

  // Fries Specials
  { id: 'f1', name: 'Fatty Fries', description: 'Loaded fatty fries with all toppings', price: 850, category: 'fries', image: '/images/fatty-fries.jpeg', popular: true, rating: 4.9 },
  { id: 'f2', name: 'Moroccan Fries', description: 'Fries with Moroccan spices', price: 850, category: 'fries', image: '/images/moroccan-fries.jpeg', rating: 4.7 },

  // Drinks
  { id: 'd1', name: 'Mineral Water', description: 'Mineral water bottle', price: 100, category: 'drinks', image: '/images/mineral-water.jpeg', rating: 4.0 },
  { id: 'd2', name: 'Soft Drink', description: 'Choice of Pepsi, 7UP, or Mirinda', price: 150, category: 'drinks', image: '/images/cold-drink.jpeg', rating: 4.2 },

  // Extras
  { id: 'e1', name: 'Extra Patty', description: 'Add an extra beef patty', price: 350, category: 'extras', image: '/images/beef-classic-burger.jpeg', rating: 4.5 },
  { id: 'e2', name: 'Extra Cheese', description: 'Extra cheese slice', price: 100, category: 'extras', image: '/images/mushroom-cheese-fries-2.jpeg', rating: 4.5 },
  { id: 'e3', name: 'Extra Bacon', description: 'Extra crispy bacon strips', price: 350, category: 'extras', image: '/images/beef-bacon-burger.jpeg', rating: 4.5 },
  { id: 'e4', name: 'Extra Chicken', description: 'Extra chicken piece', price: 300, category: 'extras', image: '/images/chicken-tenders.jpeg', rating: 4.5 },
  { id: 'e5', name: 'Extra Rice', description: 'Extra portion of rice', price: 100, category: 'extras', image: '/images/korean-chicken-bowl.jpeg', rating: 4.5 },

  // Meal Upgrade
  { id: 'mu1', name: 'Make It A Meal', description: 'Upgrade to a meal with fries and drink', price: 300, category: 'meal-upgrade', image: '/images/salted-fries.jpeg', rating: 4.5 },
]

export interface Deal {
  id: string
  name: string
  title: string
  items: string[]
  price: number
  image: string
}

export const deals: Deal[] = [
  {
    id: 'deal-1',
    name: 'classic-crunch-combo',
    title: 'Classic Crunch Combo',
    items: ['Crispy Chicken Burger', 'Fries', 'Soft Drink'],
    price: 1200,
    image: '/images/chicken-crispy-burger.jpeg',
  },
  {
    id: 'deal-2',
    name: 'duo-box',
    title: 'Duo Box',
    items: ['2x Beef Classic Burger', 'Fries', '2x Soft Drink'],
    price: 2000,
    image: '/images/beef-classic-burger.jpeg',
  },
  {
    id: 'deal-3',
    name: 'italian-fusion-deal',
    title: 'Italian Fusion Deal',
    items: ['Alfredo Pasta Bowl', 'Garlic Mayo Fries', 'Soft Drink'],
    price: 1700,
    image: '/images/alfredo-pasta.jpeg',
  },
  {
    id: 'deal-4',
    name: 'family-feast-box',
    title: 'Family Feast Box',
    items: ['All American Burger', 'Stuffed Chicken Burger', 'Fatty Fries', '2x Soft Drink'],
    price: 2800,
    image: '/images/all-american-burger.jpeg',
  },
]

// Helper to determine which add-ons to show for a category
export function getAddOnsForCategory(category: string): AddOn[] {
  if (category === 'beef-burgers' || category === 'chicken-burgers') {
    return burgerCustomizations
  }
  if (category === 'drinks') {
    return []
  }
  return basicAddOns
}

// Legacy export for backward compatibility
export const addOns = burgerCustomizations

export const popularItems = menuItems.filter(item => item.popular)
