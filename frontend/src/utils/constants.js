// API Configuration
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Categories list
export const CATEGORIES = [
  "furniture", "electronics", "appliances", "sports", "toys", "books", 
  "clothing", "garden", "kitchen", "tools", "e-waste", "scrap-metal", "cardboard", "general"
];

// Report reasons
export const REPORT_REASONS = [
  { value: "not_correct", label: "Not correct / Misleading", description: "Item info or location is wrong" },
  { value: "illegal_dumping", label: "Illegal Dumping", description: "Report to local council" },
  { value: "item_gone", label: "Item already gone", description: "The item is no longer available" },
  { value: "other", label: "Other", description: "Other types of concerns" }
];

// Expiry options for posts
export const EXPIRY_OPTIONS = [
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "72 hours" }
];

// Scrap metal prices for NSW
export const SCRAP_PRICES = [
  { material: "Copper (Bright/Clean)", price: "$8-12" },
  { material: "Copper (Mixed/Burnt)", price: "$6-8" },
  { material: "Brass (Mixed)", price: "$4-6" },
  { material: "Insulated Copper Wire (40%)", price: "$3-5" },
  { material: "Aluminium (Clean Extrusion)", price: "$1.50-2.50" },
  { material: "Aluminium Cans", price: "$0.80-1.20" },
  { material: "Stainless Steel", price: "$0.80-1.50" },
  { material: "White Goods", price: "$0.10-0.20" }
];

// Partner data
export const PARTNERS = {
  normans: {
    id: "normans_scrap_yard",
    name: "Norman's Scrap Metal",
    phone: "0491 099 837",
    address: "98 Glossop St, St Marys NSW",
    categories: ["scrap-metal", "appliances", "e-waste"],
    accepts: ["Scrap Metal", "White Goods", "Car Batteries", "Aluminium", "Copper", "Brass", "Steel"],
    region: "Sydney Metro",
    radiusKm: 300,
    centerLat: -33.7688,
    centerLng: 150.7742
  }
};

// Default map settings
export const DEFAULT_MAP_CENTER = [51.505, -0.09]; // London fallback
export const DEFAULT_RADIUS_KM = 105;
export const NEARBY_RADIUS_KM = 1;

// Local storage keys
export const STORAGE_KEYS = {
  HAS_VISITED: 'ucycle_has_visited',
  MY_POST_IDS: 'ucycle_my_posts',
  LAST_SEEN_POST_IDS: 'ucycle_last_seen_posts',
  NOTIFICATIONS_ENABLED: 'ucycle_nearby_notifications',
  FAVORITES: 'ucycle_favorites',
  SEEN_ADD_TO_HOME: 'ucycle_seen_add_to_home',
  SEEN_CAMERA_TIP: 'ucycle_seen_camera_tip'
};
