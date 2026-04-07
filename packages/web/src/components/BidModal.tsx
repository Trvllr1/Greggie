import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../data/mockData';
import { X, Gavel, ChevronUp, ChevronDown, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

type BidModalProps = {
  product: Product;
  onClose: () => void;
  onBid: (amount: number) => void;
};

function useCountdown(endTime: string | undefined) {
  const [remaining, setRemaining] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    if (!endTime) { setRemaining('No end time'); return; }
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ended'); setUrgency('critical'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
      setUrgency(diff <= 30000 ? 'critical' : diff <= 120000 ? 'warning' : 'normal');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return { remaining, urgency };
}

export function BidModal({ product, onClose, onBid }: BidModalProps) {
  const currentBid = product.currentBid || product.price;
  const minIncrement = 5;
  const [bidAmount, setBidAmount] = useState(currentBid + minIncrement);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveBid, setLiveBid] = useState(currentBid);
  const [liveBidCount, setLiveBidCount] = useState(product.bidCount ?? 0);
  const [liveEndTime, setLiveEndTime] = useState(product.endTime);
  const [outbid, setOutbid] = useState(false);
  const [bidHistory, setBidHistory] = useState<api.BidHistoryItem[]>([]);
  const outbidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { on } = useWebSocket();
  const { remaining, urgency } = useCountdown(liveEndTime);

  // Load bid history on mount
  useEffect(() => {
    api.getBidHistory(product.id).then(setBidHistory).catch(() => {});
  }, [product.id]);

  // Listen for real-time bid updates
  useEffect(() => {
    const unsub = on('bid:update', (msg) => {
      const p = msg.payload as Record<string, unknown>;
      if (p.product_id !== product.id) return;

      const newBid = (p.current_bid as number) / 100;
      setLiveBid(newBid);
      setLiveBidCount(p.bid_count as number);
      if (p.auction_end_at) setLiveEndTime(p.auction_end_at as string);

      // If someone else outbid us, show warning
      setOutbid(true);
      clearTimeout(outbidTimerRef.current);
      outbidTimerRef.current = setTimeout(() => setOutbid(false), 4000);

      // Ensure bid amount stays above current
      setBidAmount(prev => Math.max(prev, newBid + minIncrement));

      // Prepend to bid history
      setBidHistory(prev => [{
        id: crypto.randomUUID(),
        product_id: product.id,
        user_id: p.bidder_id as string,
        amount_cents: p.bid_amount_cents as number,
        created_at: new Date().toISOString(),
      }, ...prev].slice(0, 50));
    });

    const unsubEnd = on('auction:end', (msg) => {
      const p = msg.payload as Record<string, unknown>;
      if (p.product_id !== product.id) return;
      setError('Auction has ended');
    });

    return () => { unsub(); unsubEnd(); };
  }, [on, product.id]);

  const handlePlaceBid = async () => {
    setIsProcessing(true);
    setError(null);
    setOutbid(false);
    try {
      await api.placeBid(product.id, Math.round(bidAmount * 100));
      onBid(bidAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bid failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const urgencyColor = urgency === 'critical' ? 'text-red-600' : urgency === 'warning' ? 'text-orange-500' : 'text-gray-500';
  const isEnded = remaining === 'Ended';

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

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Product info + live stats */}
        <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <img src={product.mediaUrl} alt={product.name} className="h-20 w-20 rounded-xl object-cover shadow-sm" />
          <div className="flex flex-1 flex-col justify-between">
            <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500">Current Bid:</span>
              <span className="text-lg font-bold text-indigo-600">${liveBid.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-gray-400">
                <TrendingUp size={12} /> {liveBidCount} bid{liveBidCount !== 1 ? 's' : ''}
              </span>
              <span className={`flex items-center gap-1 ${urgencyColor} font-medium`}>
                <Clock size={12} /> {remaining}
              </span>
            </div>
          </div>
        </div>

        {/* Outbid warning */}
        <AnimatePresence>
          {outbid && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700"
            >
              <AlertTriangle size={16} />
              You&apos;ve been outbid! Increase your bid to stay in the lead.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bid amount controls */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 text-center">Your Bid</label>
          <div className="flex items-center justify-center gap-6">
            <button 
              onClick={() => setBidAmount(Math.max(liveBid + minIncrement, bidAmount - 5))}
              className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              disabled={isEnded}
            >
              <ChevronDown size={24} />
            </button>
            <div className="text-4xl font-bold text-gray-900 tabular-nums">
              ${bidAmount.toFixed(2)}
            </div>
            <button 
              onClick={() => setBidAmount(bidAmount + 5)}
              className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              disabled={isEnded}
            >
              <ChevronUp size={24} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[10, 25, 50].map(increment => (
              <button
                key={increment}
                onClick={() => setBidAmount(liveBid + increment)}
                className="py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isEnded}
              >
                +${increment}
              </button>
            ))}
          </div>
        </div>

        {/* Bid History */}
        {bidHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Recent Bids</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {bidHistory.slice(0, 10).map((b) => (
                <div key={b.id} className="flex justify-between text-sm px-2 py-1 rounded-lg bg-gray-50">
                  <span className="text-gray-500 truncate max-w-[120px]">{b.user_id.slice(0, 8)}…</span>
                  <span className="font-medium text-gray-900">${(b.amount_cents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-gray-100 bg-white p-6 space-y-3">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          onClick={handlePlaceBid}
          disabled={isProcessing || bidAmount <= liveBid || isEnded}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-200 transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {isProcessing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-6 w-6 rounded-full border-2 border-white border-t-transparent"
            />
          ) : isEnded ? (
            'Auction Ended'
          ) : (
            <>
              <Gavel size={24} />
              Confirm Bid — ${bidAmount.toFixed(2)}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
