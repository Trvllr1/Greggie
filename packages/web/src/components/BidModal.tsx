import { motion } from 'motion/react';
import { Product } from '../data/mockData';
import { X, Gavel, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

type BidModalProps = {
  product: Product;
  onClose: () => void;
  onBid: (amount: number) => void;
};

export function BidModal({ product, onClose, onBid }: BidModalProps) {
  const currentBid = product.currentBid || product.price;
  const [bidAmount, setBidAmount] = useState(currentBid + 10);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlaceBid = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onBid(bidAmount);
    }, 1000);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[32px] bg-white shadow-2xl max-h-[90vh]"
    >
      <div className="flex-shrink-0 pt-4 pb-2 flex justify-center">
        <div className="h-1.5 w-12 rounded-full bg-gray-300" />
      </div>
      
      <div className="flex-shrink-0 flex items-center justify-between px-6 pb-4 border-b border-gray-100">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Place a Bid</h2>
        <button
          onClick={onClose}
          className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <img src={product.mediaUrl} alt={product.name} className="h-20 w-20 rounded-xl object-cover shadow-sm" />
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
              <p className="text-sm text-gray-500">Current Bid: <span className="font-bold text-gray-900">${currentBid.toFixed(2)}</span></p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 text-center">Your Max Bid</label>
          <div className="flex items-center justify-center gap-6">
            <button 
              onClick={() => setBidAmount(Math.max(currentBid + 5, bidAmount - 5))}
              className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <ChevronDown size={24} />
            </button>
            <div className="text-4xl font-bold text-gray-900 tabular-nums">
              ${bidAmount.toFixed(2)}
            </div>
            <button 
              onClick={() => setBidAmount(bidAmount + 5)}
              className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <ChevronUp size={24} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[10, 25, 50].map(increment => (
              <button
                key={increment}
                onClick={() => setBidAmount(currentBid + increment)}
                className="py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                +${increment}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-gray-100 bg-white p-6">
        <button
          onClick={handlePlaceBid}
          disabled={isProcessing || bidAmount <= currentBid}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-200 transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {isProcessing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-6 w-6 rounded-full border-2 border-white border-t-transparent"
            />
          ) : (
            <>
              <Gavel size={24} />
              Confirm Bid
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
