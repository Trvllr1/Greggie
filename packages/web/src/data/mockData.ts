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
};

export type Channel = {
  id: string;
  title: string;
  type: 'LIVE' | 'RELAY' | 'SCHEDULED';
  streamUrl: string; // Using picsum or similar for mock video/image
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
    streamUrl: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&q=80&w=1200&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1626197031507-c17099753214?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800&h=600',
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
        mediaUrl: 'https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&q=80&w=400',
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
    streamUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800&h=600',
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
        mediaUrl: 'https://images.unsplash.com/photo-1602584386319-fa8eb4361c2c?auto=format&fit=crop&q=80&w=400',
        description: 'Genuine leather with brass hardware.',
        saleType: 'buy_now',
      }
    ],
  },
  {
    id: 'c15',
    title: 'Adventure Awaits: Travel Gear',
    type: 'RELAY',
    streamUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800&h=600',
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
        mediaUrl: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&q=80&w=400',
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
    streamUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800&h=600',
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
    streamUrl: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&q=80&w=800&h=600',
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
        mediaUrl: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?auto=format&fit=crop&q=80&w=400',
        description: 'Original 1973 pressing, VG+ condition.',
        saleType: 'buy_now',
      }
    ],
  }
];
