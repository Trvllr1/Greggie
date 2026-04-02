export type ProductVariantOption = {
  id: string;
  groupId: string;
  label: string;
  value: string;  // hex color, image url, or empty
  position: number;
};

export type ProductVariantGroup = {
  id: string;
  productId: string;
  name: string;    // "Color", "Size", "Storage"
  position: number;
  options: ProductVariantOption[];
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku?: string;
  priceCents?: number;
  price?: number;
  inventory: number;
  imageUrl?: string;
  isDefault: boolean;
  optionIds: string[];
};

export type ProductShipping = {
  freeShipping: boolean;
  shippingClass: 'standard' | 'express' | 'overnight' | 'freight' | 'digital';
  flatRateCents?: number;
  shipsFromCountry: string;
  shipsFromState?: string;
  handlingDays: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
};

export type ProductReview = {
  id: string;
  userName?: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  images?: string[];
  createdAt: string;
};

export type ProductSpec = {
  key: string;
  value: string;
};

export type ProductBundleItem = {
  product?: Product;
  quantity: number;
};

export type ProductBundle = {
  id: string;
  name: string;
  description: string;
  discountPct: number;
  discountCents: number;
  items: ProductBundleItem[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  inventory: number;
  mediaUrl: string;
  description: string;
  saleType?: 'buy_now' | 'auction' | 'drop';
  currentBid?: number;
  endTime?: string;
  highestBidder?: string;
  auctionStatus?: string;
  bidCount?: number;
  // Rich product fields
  brand?: string;
  condition?: 'new' | 'like_new' | 'good' | 'fair';
  category?: string;
  subcategory?: string;
  tags?: string[];
  images?: string[];
  bulletPoints?: string[];
  returnDays?: number;
  warrantyInfo?: string;
  isDigital?: boolean;
  reviewCount?: number;
  reviewAvg?: number;
  variantGroups?: ProductVariantGroup[];
  variants?: ProductVariant[];
  specs?: ProductSpec[];
  shipping?: ProductShipping;
  reviews?: ProductReview[];
  relatedProducts?: Product[];
  bundles?: ProductBundle[];
};

export type Channel = {
  id: string;
  title: string;
  type: 'LIVE' | 'RELAY' | 'SCHEDULED';
  streamUrl: string;
  thumbnailUrl?: string;
  viewers: number;
  badge?: string;
  category: string;
  isPrimary?: boolean;
  products: Product[];
  merchant: {
    name: string;
    avatar: string;
  };
  scheduledStartTime?: string;
};

// Thematic stock video streams (Mixkit, free, no auth)
const MOCK_STREAMS: Record<string, string> = {
  tech:         'https://assets.mixkit.co/videos/4915/4915-1080.mp4',          // phone/gadget
  fashion:      'https://assets.mixkit.co/videos/805/805-1080.mp4',            // fashion model
  collectibles: 'https://assets.mixkit.co/active_storage/video_items/100388/1723577663/100388-video-1080.mp4', // card manipulation
  beauty:       'https://assets.mixkit.co/videos/52046/52046-1080.mp4',        // makeup
  food:         'https://assets.mixkit.co/videos/49231/49231-720.mp4',         // cooking
  art:          'https://assets.mixkit.co/videos/40310/40310-1080.mp4',        // painting
  sneakers:     'https://assets.mixkit.co/videos/15059/15059-720.mp4',         // sneakers
  luxury:       'https://assets.mixkit.co/videos/28896/28896-1080.mp4',        // watch closeup
  fitness:      'https://assets.mixkit.co/videos/1053/1053-1080.mp4',          // yoga
  automotive:   'https://assets.mixkit.co/videos/74/74-1080.mp4',              // sports car
  tech2:        'https://assets.mixkit.co/videos/46635/46635-720.mp4',         // coding/tech
  kpop:         'https://assets.mixkit.co/videos/48507/48507-720.mp4',         // concert crowd
  pets:         'https://assets.mixkit.co/videos/45868/45868-720.mp4',         // corgi
  travel:       'https://assets.mixkit.co/videos/41576/41576-1080.mp4',        // mountain highway
  artkicks:     'https://assets.mixkit.co/videos/43444/43444-1080.mp4',        // art creation
  books:        'https://assets.mixkit.co/videos/50726/50726-1080.mp4',        // library shelf
  plants:       'https://assets.mixkit.co/videos/33422/33422-720.mp4',         // watering plant
  gaming:       'https://assets.mixkit.co/videos/43527/43527-1080.mp4',        // gaming
  vinyl:        'https://assets.mixkit.co/videos/47499/47499-720.mp4',         // record player
};

export const CATEGORIES = [
  'All',
  'Tech',
  'Fashion',
  'Collectibles',
  'Beauty',
  'Food',
  'Art',
  'Fitness',
  'Automotive',
  'Home',
  'Luxury',
  'Pets',
  'Travel',
];

export const MOCK_CHANNELS: Channel[] = [
  {
    id: 'c1',
    title: 'Samsung Galaxy Unpacked',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.tech,
    viewers: 14200,
    badge: 'EXCLUSIVE',
    category: 'Tech',
    isPrimary: true,
    merchant: {
      name: 'Samsung Official',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Samsung',
    },
    products: [
      {
        id: 'p1',
        name: 'Watch 7 Ultra',
        price: 399.99,
        inventory: 42,
        mediaUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400',
        description: 'The ultimate smartwatch for extreme sports.',
        saleType: 'buy_now',
      },
      {
        id: 'p2',
        name: 'Galaxy Buds Pro',
        price: 199.99,
        inventory: 150,
        mediaUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=400',
        description: 'Immersive sound with active noise cancellation.',
        saleType: 'drop',
        endTime: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 mins from now
      }
    ],
  },
  {
    id: 'c2',
    title: 'NYC Boutique Drop',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.fashion,
    viewers: 3200,
    badge: 'FLASH',
    category: 'Fashion',
    merchant: {
      name: 'NYC Threads',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NYC',
    },
    products: [
      {
        id: 'p3',
        name: 'Leather Crossbody Bag',
        price: 249.00,
        inventory: 5,
        mediaUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=400',
        description: 'Handcrafted Italian leather bag.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c3',
    title: 'Vintage Card Breaks',
    type: 'RELAY',
    streamUrl: MOCK_STREAMS.collectibles,
    viewers: 850,
    badge: 'REPLAY',
    category: 'Collectibles',
    merchant: {
      name: 'Card Vault',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cards',
    },
    products: [
      {
        id: 'p4',
        name: 'Holo Charizard 1st Ed',
        price: 1500.00,
        inventory: 1,
        mediaUrl: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&q=80&w=400',
        description: 'PSA 9 Mint Condition.',
        saleType: 'auction',
        currentBid: 1500.00,
        endTime: new Date(Date.now() + 1000 * 60 * 3).toISOString(), // 3 mins from now
      }
    ],
  },
  {
    id: 'c4',
    title: 'GlowUp Summer Collection',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.beauty,
    viewers: 28500,
    badge: 'TRENDING',
    category: 'Beauty',
    merchant: {
      name: 'GlowUp Cosmetics',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GlowUp',
    },
    products: [
      {
        id: 'p5',
        name: 'Sunset Eyeshadow Palette',
        price: 45.00,
        inventory: 500,
        mediaUrl: 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?auto=format&fit=crop&q=80&w=400',
        description: '12 highly pigmented warm shades.',
        saleType: 'drop',
        endTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
      },
      {
        id: 'p6',
        name: 'Hydrating Lip Oil',
        price: 18.00,
        inventory: 1200,
        mediaUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=400',
        description: 'Non-sticky, high-shine finish.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c5',
    title: 'Chef Mario Cooks Live',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.food,
    viewers: 5400,
    category: 'Food',
    merchant: {
      name: 'Chef Mario',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mario',
    },
    products: [
      {
        id: 'p7',
        name: 'Pro Chef Knife Set',
        price: 299.99,
        inventory: 20,
        mediaUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=400',
        description: 'Japanese steel, perfectly balanced.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c6',
    title: 'Live Canvas: Abstract Series',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.art,
    viewers: 1200,
    badge: 'ART',
    category: 'Art',
    merchant: {
      name: 'Elena Arts',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    },
    products: [
      {
        id: 'p8',
        name: 'Midnight Ocean (Original)',
        price: 500.00,
        inventory: 1,
        mediaUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=400',
        description: 'Acrylic on canvas, 24x36 inches.',
        saleType: 'auction',
        currentBid: 550.00,
        endTime: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
      }
    ],
  },
  {
    id: 'c7',
    title: 'SneakerHeadz: Rare Jordan Drop',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.sneakers,
    viewers: 45000,
    badge: 'HYPE',
    category: 'Fashion',
    merchant: {
      name: 'SneakerHeadz',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sneaker',
    },
    products: [
      {
        id: 'p9',
        name: 'Air Jordan 1 Retro High',
        price: 170.00,
        inventory: 10,
        mediaUrl: 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&q=80&w=400',
        description: 'Chicago colorway, deadstock.',
        saleType: 'drop',
        endTime: new Date(Date.now() + 1000 * 60 * 2).toISOString(),
      }
    ],
  },
  {
    id: 'c8',
    title: 'Luxe Watches Vault',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.luxury,
    viewers: 8900,
    badge: 'LUXURY',
    category: 'Luxury',
    merchant: {
      name: 'Timepiece Vault',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Watch',
    },
    products: [
      {
        id: 'p10',
        name: 'Rolex Submariner Date',
        price: 12000.00,
        inventory: 1,
        mediaUrl: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&q=80&w=400',
        description: 'Mint condition, box and papers included.',
        saleType: 'auction',
        currentBid: 12500.00,
        endTime: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
      }
    ],
  },
  {
    id: 'c9',
    title: 'Iron & Yoga Essentials',
    type: 'RELAY',
    streamUrl: MOCK_STREAMS.fitness,
    viewers: 450,
    category: 'Fitness',
    merchant: {
      name: 'FitLife',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fit',
    },
    products: [
      {
        id: 'p11',
        name: 'Premium Yoga Mat',
        price: 65.00,
        inventory: 200,
        mediaUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=400',
        description: 'Eco-friendly, non-slip surface.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c10',
    title: 'Classic Car Auctions',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.automotive,
    viewers: 12400,
    badge: 'PREMIUM',
    category: 'Automotive',
    merchant: {
      name: 'Auto Classics',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Auto',
    },
    products: [
      {
        id: 'p12',
        name: '1967 Ford Mustang Shelby GT500',
        price: 150000.00,
        inventory: 1,
        mediaUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=400',
        description: 'Fully restored, matching numbers.',
        saleType: 'auction',
        currentBid: 165000.00,
        endTime: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
      }
    ],
  },
  {
    id: 'c11',
    title: 'TechReview: Unboxing the Future',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.tech2,
    viewers: 18500,
    category: 'Tech',
    merchant: {
      name: 'TechReview',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech',
    },
    products: [
      {
        id: 'p13',
        name: 'Quantum VR Headset',
        price: 499.00,
        inventory: 300,
        mediaUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&q=80&w=400',
        description: 'Next-gen virtual reality experience.',
        saleType: 'drop',
        endTime: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      }
    ],
  },
  {
    id: 'c12',
    title: 'K-Pop Merch Exclusive',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.kpop,
    viewers: 52000,
    badge: 'GLOBAL',
    category: 'Collectibles',
    merchant: {
      name: 'Seoul Station',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Seoul',
    },
    products: [
      {
        id: 'p14',
        name: 'Signed Album + Lightstick Bundle',
        price: 120.00,
        inventory: 50,
        mediaUrl: 'https://images.unsplash.com/photo-1611702700098-dec597b27d9d?auto=format&fit=crop&q=80&w=400',
        description: 'Limited edition signed by all members.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c13',
    title: 'Minimalist Home Decor',
    type: 'SCHEDULED',
    streamUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800&h=600',
    viewers: 0,
    category: 'Home',
    merchant: {
      name: 'Zen Spaces',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zen',
    },
    scheduledStartTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 48 hours from now
    products: [
      {
        id: 'p15',
        name: 'Hand-poured Soy Candle',
        price: 35.00,
        inventory: 100,
        mediaUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=400',
        description: 'Sandalwood and vanilla scent.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c14',
    title: 'Spoiled Pups Boutique',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.pets,
    viewers: 6700,
    category: 'Pets',
    merchant: {
      name: 'Bark Avenue',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dog',
    },
    products: [
      {
        id: 'p16',
        name: 'Designer Dog Collar',
        price: 85.00,
        inventory: 25,
        mediaUrl: 'https://images.unsplash.com/photo-1567612529009-afe25413fbe5?auto=format&fit=crop&q=80&w=400',
        description: 'Genuine leather with brass hardware.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c15',
    title: 'Adventure Awaits: Travel Gear',
    type: 'RELAY',
    streamUrl: MOCK_STREAMS.travel,
    viewers: 1100,
    category: 'Travel',
    merchant: {
      name: 'Nomad Supply',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nomad',
    },
    products: [
      {
        id: 'p17',
        name: 'Ultralight Backpack',
        price: 150.00,
        inventory: 80,
        mediaUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400',
        description: 'Waterproof, 40L capacity.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c16',
    title: 'Custom Kicks Live',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.artkicks,
    viewers: 8500,
    badge: 'CREATIVE',
    category: 'Art',
    merchant: {
      name: 'Sole Artist',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sole',
    },
    products: [
      {
        id: 'p18',
        name: 'Custom Painted AF1s',
        price: 250.00,
        inventory: 2,
        mediaUrl: 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&q=80&w=400',
        description: 'Hand-painted galaxy design.',
        saleType: 'auction',
        currentBid: 280.00,
        endTime: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      }
    ],
  },
  {
    id: 'c17',
    title: 'Rare Books & Manuscripts',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.books,
    viewers: 3200,
    category: 'Collectibles',
    merchant: {
      name: 'Antiquarian Books',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Books',
    },
    products: [
      {
        id: 'p19',
        name: '1st Edition Great Gatsby',
        price: 4500.00,
        inventory: 1,
        mediaUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
        description: 'Original dust jacket, excellent condition.',
        saleType: 'auction',
        currentBid: 5000.00,
        endTime: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
      }
    ],
  },
  {
    id: 'c18',
    title: 'Urban Jungle: Rare Plants',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.plants,
    viewers: 14500,
    badge: 'DROP',
    category: 'Home',
    merchant: {
      name: 'Botany Bay',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Plant',
    },
    products: [
      {
        id: 'p20',
        name: 'Monstera Albo Variegata',
        price: 350.00,
        inventory: 15,
        mediaUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=400',
        description: 'Highly sought after variegated cutting.',
        saleType: 'drop',
        endTime: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
      }
    ],
  },
  {
    id: 'c19',
    title: 'Indie Game Showcase',
    type: 'LIVE',
    streamUrl: MOCK_STREAMS.gaming,
    viewers: 22000,
    category: 'Tech',
    merchant: {
      name: 'Pixel Studios',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pixel',
    },
    products: [
      {
        id: 'p21',
        name: 'Cyberpunk 2077 Collector Edition',
        price: 199.99,
        inventory: 50,
        mediaUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&q=80&w=400',
        description: 'Includes statue, artbook, and digital soundtrack.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c20',
    title: 'Vintage Vinyl Digging',
    type: 'RELAY',
    streamUrl: MOCK_STREAMS.vinyl,
    viewers: 2800,
    category: 'Collectibles',
    merchant: {
      name: 'Spin Records',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vinyl',
    },
    products: [
      {
        id: 'p22',
        name: 'Pink Floyd - Dark Side of the Moon',
        price: 45.00,
        inventory: 3,
        mediaUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=400',
        description: 'Original 1973 pressing, VG+ condition.',
        saleType: 'buy_now',
      }
    ],
  }
];
