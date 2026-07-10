export type MenuCategory = "sourdough" | "rolls";
export type UnitLabel = "loaf" | "dozen";
export type LeadTimeHours = 24 | 48;

export type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  unitLabel: UnitLabel;
  priceCents: number;
  leadTimeHours: LeadTimeHours;
  description?: string;
  available: boolean;
};

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  sourdough: "Sourdough Loaves",
  rolls: "Filipino-Inspired Rolls & Treats",
};

export const UNIT_LABELS: Record<UnitLabel, string> = {
  loaf: "loaf",
  dozen: "dozen",
};

export const menuItems: MenuItem[] = [
  // Sourdough — 48h
  {
    id: "plain-sourdough",
    name: "Plain Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 800,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "whole-wheat-sourdough",
    name: "Whole Wheat Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 900,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "honey-wheat-sourdough",
    name: "Honey Wheat Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 900,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "honey-oat-sourdough",
    name: "Honey Oat Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 900,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "ww-flaxseed-sourdough",
    name: "Whole Wheat & Flaxseed Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 1000,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "rye-flaxseed-sourdough",
    name: "Rye & Flaxseed Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 1000,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "fennel-amaranth-sourdough",
    name: "Fennel & Amaranth Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 1000,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "fennel-olives-sourdough",
    name: "Fennel & Olive Oil Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 1100,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "rosemary-olives-sourdough",
    name: "Rosemary & Olive Oil Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 1100,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "cheddar-olives-sourdough",
    name: "Cheddar & Olives Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 1200,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "multigrain-sourdough",
    name: "Multigrain Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 1200,
    leadTimeHours: 48,
    available: true,
  },
  {
    id: "ww-multigrain-sourdough",
    name: "Whole Wheat Multigrain Sourdough",
    category: "sourdough",
    unitLabel: "loaf",
    priceCents: 1200,
    leadTimeHours: 48,
    available: true,
  },

  // Pandesal — 24h
  {
    id: "classic-pandesal",
    name: "Classic Pandesal",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2000,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "malunggay-pandesal",
    name: "Malunggay Pandesal",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2000,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "sourdough-pandesal",
    name: "Sourdough Pandesal",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "ube-cheese-pandesal",
    name: "Ube Cheese Pandesal",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "ube-cream-cheese-pandesal",
    name: "Ube Cream Cheese Pandesal",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "pandan-ube-pandesal",
    name: "Pandan Pandesal with Ube Filling",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "tres-marias-pandesal",
    name: "Tres Marias Pandesal",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },

  // Spanish bread — 24h
  {
    id: "classic-spanish-bread",
    name: "Classic Spanish Bread",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2200,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "sourdough-spanish-bread",
    name: "Sourdough Spanish Bread",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "ube-cheese-spanish-bread",
    name: "Ube Cheese Spanish Bread",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "pandan-spanish-bread",
    name: "Pandan Spanish Bread",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "tres-marias-spanish-bread",
    name: "Tres Marias Spanish Bread",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },

  // Pan de coco & specialties — 24h
  {
    id: "classic-pan-de-coco",
    name: "Classic Pan de Coco",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "malunggay-pan-de-coco",
    name: "Malunggay Pan de Coco",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
  {
    id: "cheese-rolls",
    name: "Cheese Rolls",
    category: "rolls",
    unitLabel: "dozen",
    priceCents: 2500,
    leadTimeHours: 24,
    available: true,
  },
];

export function getMenuItem(id: string): MenuItem | undefined {
  return menuItems.find((item) => item.id === id);
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function getRequiredLeadTimeHours(
  itemIds: string[],
): LeadTimeHours | 0 {
  let max: LeadTimeHours | 0 = 0;
  for (const id of itemIds) {
    const item = getMenuItem(id);
    if (!item) continue;
    if (item.leadTimeHours > max) max = item.leadTimeHours;
  }
  return max;
}
