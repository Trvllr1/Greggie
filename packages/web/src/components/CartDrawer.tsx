import { motion } from 'motion/react';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { ButterflyIcon } from './ButterflyIcon';
import type { LocalCartItem } from '../hooks/useCart';

type Props = {
  items: LocalCartItem[];
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClose: () => void;
  onCheckout: () => void;
  onViewProduct?: (product: LocalCartItem['product']) => void;
};

export function CartDrawer({ items, total, onUpdateQuantity, onRemoveItem, onClose, onCheckout, onViewProduct }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 flex w-full max-w-md flex-col bg-[#0F0F18] border-l border-white/10"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-bold text-white">Your Cart</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/70">
            <X size={20} />
          </button>
        </header>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <ButterflyIcon size={48} />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.product.id}
                className="flex gap-3 rounded-xl bg-white/5 p-3 border border-white/10"
              >
                {/* Thumbnail — clickable */}
                <button
                  onClick={() => onViewProduct?.(item.product)}
                  className="h-16 w-16 flex-shrink-0 rounded-lg bg-white/10 overflow-hidden hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer"
                >
                  {item.product.mediaUrl && (
                    <img src={item.product.mediaUrl} alt={item.product.name} className="h-full w-full object-cover" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onViewProduct?.(item.product)}
                    className="text-sm font-medium text-white truncate block text-left hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    {item.product.name}
                  </button>
                  <p className="text-sm text-indigo-400 font-bold">
                    ${item.product.price.toFixed(2)}
                  </p>

                  {/* Qty controls */}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="p-2 rounded hover:bg-white/10 text-white/50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs text-white/80 w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="p-2 rounded hover:bg-white/10 text-white/50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  className="self-start p-2 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Total ({items.length} item{items.length !== 1 ? 's' : ''})</span>
              <span className="text-lg font-bold text-white">${total.toFixed(2)}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onCheckout}
              className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
            >
              Checkout
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
