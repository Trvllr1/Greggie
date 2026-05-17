import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { MapPin, Search, Heart, Loader2 } from 'lucide-react';
import * as api from '../services/api';
import type { Product } from '../data/mockData';

/* ── BrowseFeed ───────────────────────────────────────────
   Chronological "Just Posted" landing — the default Marketplace
   experience. Sticky header with search, category pills, and a
   Near-me toggle that uses navigator.geolocation. Infinite scroll
   via "Load more" button (no IntersectionObserver dependency).
   ────────────────────────────────────────────────────────── */

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Garden', 'Beauty', 'Sports',
  'Toys & Games', 'Collectibles', 'Vehicles', 'Books',
];

type Props = {
  onViewProduct: (product: Product) => void;
};

type Coords = { lat: number; lng: number };

function ProductCard({ p, onView, onToggleSave }: {
  p: Product;
  onView: (p: Product) => void;
  onToggleSave: (p: Product) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onView(p)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-indigo-500/30"
    >
      <div className="relative aspect-square overflow-hidden bg-black/40">
        {p.mediaUrl ? (
          <img
            src={p.mediaUrl}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/30 text-xs">
            No photo
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(p);
          }}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/80"
          aria-label={p.isSaved ? 'Unsave' : 'Save'}
        >
          <Heart
            size={16}
            fill={p.isSaved ? '#f43f5e' : 'none'}
            className={p.isSaved ? 'text-rose-500' : 'text-white'}
          />
        </button>
      </div>
      <div className="p-2.5">
        <div className="truncate text-sm font-semibold text-white">{p.name}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-bold text-emerald-400">
            ${p.price.toFixed(2)}
          </span>
          {p.locationZip && (
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <MapPin size={10} />
              {p.locationZip}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function BrowseFeed({ onViewProduct }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [nearMe, setNearMe] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const PAGE = 24;

  const load = useCallback(
    async (offset: number, replace: boolean) => {
      try {
        const params: api.RecentFeedParams = {
          limit: PAGE,
          offset,
          category: category || undefined,
        };
        if (nearMe && coords) {
          params.lat = coords.lat;
          params.lng = coords.lng;
          params.radiusKm = 40;
        }
        let result: Product[];
        if (search.trim()) {
          // Fall back to full-text search when user types a query.
          result = await api.searchProducts({
            q: search.trim(),
            category: category || undefined,
            limit: PAGE,
            offset,
            sort: 'newest',
          });
        } else {
          result = await api.getRecentProducts(params);
        }
        setHasMore(result.length === PAGE);
        setProducts((prev) => (replace ? result : [...prev, ...result]));
      } catch {
        if (replace) setProducts([]);
        setHasMore(false);
      }
    },
    [category, nearMe, coords, search],
  );

  useEffect(() => {
    setLoading(true);
    load(0, true).finally(() => setLoading(false));
  }, [load]);

  const handleNearMe = () => {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMe(true);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message || 'Could not get your location.');
      },
      { timeout: 8000, maximumAge: 60000 },
    );
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await load(products.length, false);
    setLoadingMore(false);
  };

  const handleToggleSave = async (p: Product) => {
    // Optimistic toggle.
    const willSave = !p.isSaved;
    setProducts((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, isSaved: willSave } : item)),
    );
    try {
      if (willSave) await api.saveProduct(p.id);
      else await api.unsaveProduct(p.id);
    } catch {
      // Roll back on failure.
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isSaved: !willSave } : item)),
      );
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0A0A0F] text-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0A0A0F]/95 backdrop-blur-md">
        <div className="p-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Marketplace"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Category pills + Near me */}
        <div className="flex items-center gap-2 overflow-x-auto px-3 pb-3 scrollbar-none">
          <button
            onClick={handleNearMe}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              nearMe
                ? 'bg-indigo-500 text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <MapPin size={12} />
            {nearMe ? 'Near me' : 'Near me'}
          </button>
          <button
            onClick={() => setCategory('')}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              !category ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? '' : c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === c
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {geoError && (
          <div className="border-t border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200">
            {geoError}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/40">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-white/40">
            <span className="text-sm">No listings here yet.</span>
            <span className="text-xs">Be the first to post something.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  onView={onViewProduct}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
