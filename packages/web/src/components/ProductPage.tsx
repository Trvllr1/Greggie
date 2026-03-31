import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShoppingCart, Plus, Minus, Package } from 'lucide-react';
import type { Product } from '../data/mockData';

type Props = {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenCart: () => void;
  cartCount: number;
};

export function ProductPage({ product, onBack, onAddToCart, onOpenCart, cartCount }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white flex-1 truncate">{product.name}</h1>
        <button
          onClick={onOpenCart}
          className="relative p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        <div className="aspect-square w-full bg-white/5">
          {product.mediaUrl ? (
            <img src={product.mediaUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package size={64} className="text-white/20" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="px-4 py-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">{product.name}</h2>
            <p className="text-2xl font-bold text-indigo-400 mt-1">${product.price.toFixed(2)}</p>
          </div>

          {product.description && (
            <p className="text-sm text-white/60 leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-white/40">
            {product.saleType && (
              <span className="rounded-full bg-white/10 px-3 py-1 capitalize">{product.saleType.replace('_', ' ')}</span>
            )}
            {product.inventory > 0 && (
              <span className="rounded-full bg-white/10 px-3 py-1">{product.inventory} left</span>
            )}
          </div>

          {/* Quantity selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">Qty</span>
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-1 rounded hover:bg-white/10 text-white/60"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-medium text-white">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.inventory || 99, quantity + 1))}
                className="p-1 rounded hover:bg-white/10 text-white/60"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-white/10 p-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAddToCart}
          disabled={product.inventory === 0}
          className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors ${
            added
              ? 'bg-green-500 text-white'
              : product.inventory === 0
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          {added ? 'Added to Cart ✓' : product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
        </motion.button>
      </div>
    </div>
  );
}
