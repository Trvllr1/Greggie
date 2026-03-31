import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BadgeCheck, MapPin } from 'lucide-react';
import * as api from '../services/api';
import type { Product } from '../data/mockData';

type Props = {
  slug: string;
  onViewProduct: (product: Product) => void;
  onBack: () => void;
};

export function ShopPage({ slug, onViewProduct, onBack }: Props) {
  const [shop, setShop] = useState<api.Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getShopBySlug(slug)
      .then(setShop)
      .catch(() => setShop(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: '#0A0A0F' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center" style={{ backgroundColor: '#0A0A0F' }}>
        <p className="text-white/40 mb-4">Shop not found</p>
        <button onClick={onBack} className="text-indigo-400 text-sm underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 truncate">{shop.name}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Banner */}
        {shop.banner_url && (
          <div className="h-40 w-full bg-white/5">
            <img src={shop.banner_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {/* Shop info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-14 w-14 rounded-full object-cover border-2 border-white/10" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-indigo-500/20 flex items-center justify-center text-xl font-bold text-indigo-400">
                {shop.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{shop.name}</h2>
                {shop.is_verified && <BadgeCheck size={16} className="text-indigo-400" />}
              </div>
              {shop.shipping_from && (
                <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                  <MapPin size={12} />
                  <span>Ships from {shop.shipping_from}</span>
                </div>
              )}
            </div>
          </div>
          {shop.description && (
            <p className="mt-3 text-sm text-white/60 leading-relaxed">{shop.description}</p>
          )}
        </div>

        {/* Products */}
        <div className="px-4 py-4">
          <h3 className="text-sm font-semibold text-white/70 mb-3">{shop.products?.length ?? 0} Products</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(shop.products ?? []).map(product => (
              <motion.button
                key={product.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onViewProduct(product)}
                className="rounded-xl overflow-hidden bg-white/5 border border-white/10 text-left transition-colors hover:border-white/20"
              >
                <div className="aspect-square w-full bg-white/10">
                  {product.mediaUrl && (
                    <img src={product.mediaUrl} alt={product.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-white/90 font-medium truncate">{product.name}</p>
                  <p className="text-xs text-indigo-400 font-bold">${product.price.toFixed(2)}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
