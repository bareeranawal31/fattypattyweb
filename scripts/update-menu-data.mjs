// Update all menu items, categories, and deals with correct images and prices
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nvqhlcdfvhmgmvhstkgw.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ============================================================
// CATEGORIES — update images + add new categories
// ============================================================
const categories = [
  { id: "starters",        name: "Starters",        sort_order: 1, image: "/images/chicken-wings.jpeg" },
  { id: "chicken-burgers",  name: "Chicken Burgers",  sort_order: 2, image: "/images/chicken-signature-burger.jpeg" },
  { id: "beef-burgers",     name: "Beef Burgers",     sort_order: 3, image: "/images/beef-classic-burger.jpeg" },
  { id: "bowls",            name: "Bowls",            sort_order: 4, image: "/images/korean-chicken-bowl.jpeg" },
  { id: "pasta",            name: "Pasta",            sort_order: 5, image: "/images/alfredo-pasta.jpeg" },
  { id: "fries",            name: "Fries Specials",   sort_order: 6, image: "/images/fatty-fries.jpeg" },
  { id: "drinks",           name: "Drinks",           sort_order: 7, image: "/images/cold-drink.jpeg" },
  { id: "extras",           name: "Extras",           sort_order: 8, image: "/images/mushroom-cheese-fries-2.jpeg" },
  { id: "meal-upgrade",     name: "Meal Upgrade",     sort_order: 9, image: "/images/salted-fries.jpeg" },
];

// ============================================================
// MENU ITEMS — all items with correct prices and images
// ============================================================
const menuItems = [
  // --- Starters ---
  { id: "s1", name: "Crispy Chicken Wings",   price: 600,  category_id: "starters", sort_order: 1, image: "/images/chicken-wings.jpeg",         description: "Crispy golden chicken wings with signature seasoning", is_available: true },
  { id: "s2", name: "Crispy Chicken Tender",   price: 600,  category_id: "starters", sort_order: 2, image: "/images/chicken-tenders.jpeg",        description: "Crispy chicken tenders served with dipping sauce", is_available: true },
  { id: "s3", name: "Mushroom Cheese Fries",   price: 650,  category_id: "starters", sort_order: 3, image: "/images/mushroom-cheese-fries.jpeg",  description: "Loaded fries with mushroom and melted cheese", is_available: true },
  { id: "s4", name: "Jalapeño Fries",          price: 600,  category_id: "starters", sort_order: 4, image: "/images/jalapeno-fries.jpeg",         description: "Crispy fries topped with spicy jalapeños", is_available: true },
  { id: "s5", name: "Fries",                   price: 300,  category_id: "starters", sort_order: 5, image: "/images/salted-fries.jpeg",           description: "Classic salted fries", is_available: true },
  { id: "s6", name: "Garlic Mayo Fries",        price: 400,  category_id: "starters", sort_order: 6, image: "/images/garlic-mayo-fries.jpeg",      description: "Fries with creamy garlic mayo sauce", is_available: true },

  // --- Chicken Burgers ---
  { id: "c1", name: "Stuffed Chicken",         price: 1200, category_id: "chicken-burgers", sort_order: 1, image: "/images/stuffed-chicken-burger.jpeg",    description: "Premium stuffed chicken burger", is_available: true },
  { id: "c2", name: "Chicken Jalapeño",        price: 750,  category_id: "chicken-burgers", sort_order: 2, image: "/images/chicken-jalapeno-burger.jpeg",   description: "Spicy chicken burger with jalapeños", is_available: true },
  { id: "c3", name: "Crispy Chicken",          price: 750,  category_id: "chicken-burgers", sort_order: 3, image: "/images/chicken-crispy-burger.jpeg",     description: "Crispy fried chicken burger", is_available: true },
  { id: "c4", name: "Chicken Signature",        price: 750,  category_id: "chicken-burgers", sort_order: 4, image: "/images/chicken-signature-burger.jpeg",  description: "Our signature chicken burger", is_available: true },

  // --- Beef Burgers ---
  { id: "b1", name: "All American",            price: 1150, category_id: "beef-burgers", sort_order: 1, image: "/images/all-american-burger.jpeg",     description: "Classic All American beef burger", is_available: true },
  { id: "b2", name: "Beef Signature",          price: 1000, category_id: "beef-burgers", sort_order: 2, image: "/images/beef-signature-burger.jpeg",   description: "Signature beef burger with special sauce", is_available: true },
  { id: "b3", name: "Beef Jalapeño",           price: 800,  category_id: "beef-burgers", sort_order: 3, image: "/images/beef-jalapeno-burger.jpeg",    description: "Spicy beef burger with jalapeños", is_available: true },
  { id: "b4", name: "Beef Classic",            price: 800,  category_id: "beef-burgers", sort_order: 4, image: "/images/beef-classic-burger.jpeg",     description: "Classic beef burger", is_available: true },
  { id: "b5", name: "Classic Wagyu",           price: 2800, category_id: "beef-burgers", sort_order: 5, image: "/images/chicken-wagyu-burger.jpeg",    description: "Premium wagyu beef burger", is_available: true },
  { id: "b6", name: "Beef Bacon",              price: 1100, category_id: "beef-burgers", sort_order: 6, image: "/images/beef-bacon-burger.jpeg",       description: "Beef burger with crispy bacon", is_available: true },
  { id: "b7", name: "Red Mushroom",            price: 900,  category_id: "beef-burgers", sort_order: 7, image: "/images/red-mushroom-burger.jpeg",     description: "Beef burger with red mushroom sauce", is_available: true },

  // --- Bowls ---
  { id: "bo1", name: "Moroccan Chicken Bowl",   price: 1200, category_id: "bowls", sort_order: 1, image: "/images/moroccan-chicken-bowl.jpeg",  description: "Moroccan spiced chicken rice bowl", is_available: true },
  { id: "bo2", name: "Korean Chicken Bowl",     price: 1200, category_id: "bowls", sort_order: 2, image: "/images/korean-chicken-bowl.jpeg",    description: "Korean style chicken rice bowl", is_available: true },

  // --- Pasta ---
  { id: "p1", name: "Alfredo Pasta Bowl",       price: 1200, category_id: "pasta", sort_order: 1, image: "/images/alfredo-pasta.jpeg",          description: "Creamy alfredo pasta bowl", is_available: true },

  // --- Fries Specials ---
  { id: "f1", name: "Fatty Fries",             price: 850,  category_id: "fries", sort_order: 1, image: "/images/fatty-fries.jpeg",            description: "Loaded fatty fries with all toppings", is_available: true },
  { id: "f2", name: "Moroccan Fries",          price: 850,  category_id: "fries", sort_order: 2, image: "/images/moroccan-fries.jpeg",          description: "Fries with Moroccan spices", is_available: true },

  // --- Drinks ---
  { id: "d1", name: "Mineral Water",           price: 100,  category_id: "drinks", sort_order: 1, image: "/images/mineral-water.jpeg",          description: "Mineral water bottle", is_available: true },
  { id: "d2", name: "Soft Drink",              price: 150,  category_id: "drinks", sort_order: 2, image: "/images/cold-drink.jpeg",             description: "Chilled soft drink", is_available: true },

  // --- Extras (NEW) ---
  { id: "e1", name: "Extra Patty",             price: 350,  category_id: "extras", sort_order: 1, image: "/images/beef-classic-burger.jpeg",    description: "Add an extra beef patty", is_available: true },
  { id: "e2", name: "Extra Cheese",            price: 100,  category_id: "extras", sort_order: 2, image: "/images/mushroom-cheese-fries-2.jpeg", description: "Extra cheese slice", is_available: true },
  { id: "e3", name: "Extra Bacon",             price: 350,  category_id: "extras", sort_order: 3, image: "/images/beef-bacon-burger.jpeg",      description: "Extra crispy bacon strips", is_available: true },
  { id: "e4", name: "Extra Chicken",           price: 300,  category_id: "extras", sort_order: 4, image: "/images/chicken-tenders.jpeg",        description: "Extra chicken piece", is_available: true },
  { id: "e5", name: "Extra Rice",              price: 100,  category_id: "extras", sort_order: 5, image: "/images/korean-chicken-bowl.jpeg",    description: "Extra portion of rice", is_available: true },

  // --- Meal Upgrade (NEW) ---
  { id: "mu1", name: "Make It A Meal",          price: 300,  category_id: "meal-upgrade", sort_order: 1, image: "/images/salted-fries.jpeg",     description: "Upgrade to a meal with fries and drink", is_available: true },
];

// ============================================================
// DEALS — update with better images
// ============================================================
const deals = [
  {
    id: "deal-1",
    title: "Classic Crunch Combo",
    price: 1200,
    image: "/images/chicken-crispy-burger.jpeg",
    is_active: true,
    items: ["Crispy Chicken Burger", "Fries", "Soft Drink"],
    sort_order: 1,
  },
  {
    id: "deal-2",
    title: "Duo Box",
    price: 2000,
    image: "/images/beef-classic-burger.jpeg",
    is_active: true,
    items: ["2x Beef Classic Burger", "Fries", "2x Soft Drink"],
    sort_order: 2,
  },
  {
    id: "deal-3",
    title: "Italian Fusion Deal",
    price: 1700,
    image: "/images/alfredo-pasta.jpeg",
    is_active: true,
    items: ["Alfredo Pasta Bowl", "Garlic Mayo Fries", "Soft Drink"],
    sort_order: 3,
  },
  {
    id: "deal-4",
    title: "Family Feast Box",
    price: 2800,
    image: "/images/all-american-burger.jpeg",
    is_active: true,
    items: ["All American Burger", "Stuffed Chicken Burger", "Fatty Fries", "2x Soft Drink"],
    sort_order: 4,
  },
];

// ============================================================
// EXECUTE
// ============================================================
async function main() {
  console.log("🔄 Updating categories...");
  // First delete any test items that might conflict
  const { error: delTestErr } = await supabase
    .from("menu_items")
    .delete()
    .like("id", "item-%");
  if (delTestErr) console.log("  (cleanup test items:", delTestErr.message, ")");

  const { error: delTestDealErr } = await supabase
    .from("deals")
    .delete()
    .like("id", "deal-1%");  // clean up test deals like deal-1772832587150-*
  // Keep deal-1 through deal-4 by re-upserting below

  // Upsert categories
  for (const cat of categories) {
    const { error } = await supabase
      .from("categories")
      .upsert(cat, { onConflict: "id" });
    if (error) {
      console.log(`  ❌ Category ${cat.id}: ${error.message}`);
    } else {
      console.log(`  ✅ Category: ${cat.id} — ${cat.name}`);
    }
  }

  console.log("\n🔄 Upserting menu items...");
  for (const item of menuItems) {
    const { error } = await supabase
      .from("menu_items")
      .upsert(item, { onConflict: "id" });
    if (error) {
      console.log(`  ❌ Item ${item.id} (${item.name}): ${error.message}`);
    } else {
      console.log(`  ✅ ${item.id} — ${item.name} — Rs.${item.price} — ${item.image}`);
    }
  }

  console.log("\n🔄 Upserting deals...");
  // Delete all existing deals first, then re-insert
  const { error: delDealsErr } = await supabase
    .from("deals")
    .delete()
    .neq("id", "___never_match___");
  if (delDealsErr) console.log("  ⚠️ Delete deals:", delDealsErr.message);

  for (const deal of deals) {
    const { error } = await supabase
      .from("deals")
      .upsert(deal, { onConflict: "id" });
    if (error) {
      console.log(`  ❌ Deal ${deal.id} (${deal.title}): ${error.message}`);
    } else {
      console.log(`  ✅ ${deal.id} — ${deal.title} — Rs.${deal.price} — ${deal.image}`);
    }
  }

  // Verify
  console.log("\n📊 Verification:");
  const { data: catCount } = await supabase.from("categories").select("id", { count: "exact" });
  const { data: itemCount } = await supabase.from("menu_items").select("id", { count: "exact" });
  const { data: dealCount } = await supabase.from("deals").select("id", { count: "exact" });
  console.log(`  Categories: ${catCount?.length}`);
  console.log(`  Menu items: ${itemCount?.length}`);
  console.log(`  Deals: ${dealCount?.length}`);
  console.log("\n✅ Database update complete!");
}

main().catch(console.error);
