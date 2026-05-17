import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Loader2, MapPin } from 'lucide-react';
import * as api from '../services/api';
import type { Product } from '../data/mockData';

/* ── SavedItems ───────────────────────────────────────────
   Renders the authenticated user's saved products grid.
   Tapping the heart unsaves immediately (optimistic).
   Tapping the card opens the product details view.
   ────────────────────────────────────────────────────────── */

type Props = {
  onViewProduct: (product: Product) => void;
};

export function SavedItems({ onViewProduct }: Props) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getSavedProducts();
        if (active) setItems(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load saved items');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleUnsave = async (p: Product) => {
    const prev = items;
    setItems((curr) => curr.filter((item) => item.id !== p.id));
    try {
      await api.unsaveProduct(p.id);
    } catch {
      setItems(prev);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0A0A0F] text-white/40">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0A0A0F] px-6 text-center text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0A0A0F] px-6 text-center text-white/50">
        <Heart size={32} className="text-white/30" />
        <div className="text-sm font-semibold text-white/70">No saved items yet</div>
        <div className="text-xs text-white/40">Tap the heart on any listing to save it for later.</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0A0A0F] p-3 text-white">
      <h2 className="mb-3 px-1 text-base font-bold">Saved</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onViewProduct(p)}
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
                <div className="flex h-full w-full items-center justify-center text-xs text-white/30">
                  No photo
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnsave(p);
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/80"
                aria-label="Unsave"
              >
                <Heart size={16} fill="#f43f5e" className="text-rose-500" />
              </button>
            </div>
            <div className="p-2.5">
              <div className="truncate text-sm font-semibold">{p.name}</div>
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
        ))}
      </div>
    </div>
  );
}
