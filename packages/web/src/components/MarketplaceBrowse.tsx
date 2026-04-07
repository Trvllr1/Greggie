import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, ArrowLeft, TrendingUp, Flame, Sparkles,
  Clock, Gavel, Radio, ChevronRight, ChevronDown, Eye, SlidersHorizontal, X, Zap,
  Tag, Star, Package, User, LayoutGrid, Tv, Store,
} from 'lucide-react';
import * as api from '../services/api';
import type { Product } from '../data/mockData';
import { MOCK_GATEWAY, MOCK_CHANNELS } from '../data/mockData';
import type { MappedGateway, GatewayChannel, BillboardPlacement } from '../services/api';
import { ButterflyIcon } from './ButterflyIcon';

/* ── Constants ────────────────────────────────────────── */
const CONDITIONS = ['All', 'new', 'like_new', 'good', 'fair'] as const;
const SORTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
] as const;

// All mock products for local fallback search
const ALL_MOCK_PRODUCTS: Product[] = MOCK_CHANNELS.flatMap(ch =>
  ch.products.map(p => ({ ...p, category: ch.category })),
);

function mockSearch(q: string, category?: string | null): Product[] {
  let results = ALL_MOCK_PRODUCTS;
  if (category && category !== 'All') {
    results = results.filter(p => p.category === category);
  }
  if (q.trim()) {
    const lower = q.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      (p.category && p.category.toLowerCase().includes(lower))
    );
  }
  return results;
}

type Props = {
  onViewProduct: (product: Product) => void;
  onOpenCart: () => void;
  onGoHome: () => void;
  cartCount: number;
  onWatchChannel?: (channelId: string) => void;
  onOpenProfile?: () => void;
  onOpenRail?: () => void;
  onGoToCreatorStudio?: () => void;
  onGoToLiveView?: () => void;
  onGoToSellerProgram?: () => void;
};

/* ── Section Header ───────────────────────────────────── */
function SectionHeader({
  icon, title, accent = 'indigo', onViewAll,
}: { icon: React.ReactNode; title: string; accent?: string; onViewAll?: () => void }) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
  };
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className={colors[accent] ?? 'text-indigo-400'}>{icon}</span>
        <h2 className="text-sm font-bold text-white tracking-wide uppercase">{title}</h2>
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          View all <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

/* ── Product Card (shared) ────────────────────────────── */
function ProductCard({
  product, onClick, size = 'md', rank,
}: { product: Product; onClick: () => void; size?: 'sm' | 'md' | 'lg'; rank?: number }) {
  const widths = { sm: 'w-36', md: 'w-44', lg: 'w-56' };
  const aspects = { sm: 'aspect-square', md: 'aspect-[4/5]', lg: 'aspect-[3/4]' };
  const discount = product.saleType === 'buy_now' && product.price > 0 ? null : null; // placeholder for deal logic
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex-shrink-0 ${widths[size]} rounded-2xl overflow-hidden text-left group relative
        bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/[0.08]
        hover:border-white/20 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300`}
    >
      {rank && (
        <div className="absolute top-2 left-2 z-10 flex items-center justify-center w-7 h-7 rounded-full
          bg-black/60 backdrop-blur-sm border border-white/20 text-xs font-black text-white">
          {rank}
        </div>
      )}
      {product.saleType === 'auction' && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full
          bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-black">
          <Gavel size={10} /> Bid
        </div>
      )}
      {product.saleType === 'drop' && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full
          bg-violet-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
          <Zap size={10} /> Drop
        </div>
      )}
      <div className={`${aspects[size]} w-full bg-white/5 overflow-hidden`}>
        {product.mediaUrl ? (
          <img
            src={product.mediaUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
            <Package size={28} className="text-white/20" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-white/90 font-medium truncate leading-tight">{product.name}</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <p className="text-sm text-white font-bold">${product.price.toFixed(2)}</p>
          {discount && (
            <p className="text-[10px] text-white/30 line-through">${(product.price * 1.3).toFixed(2)}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Horizontal Scroll Row ────────────────────────────── */
function ScrollRow({
  children, className = '',
}: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {children}
    </div>
  );
}

/* ── Live Channel Card ────────────────────────────────── */
function LiveChannelCard({ channel, onClick }: { channel: GatewayChannel; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex-shrink-0 w-64 rounded-2xl overflow-hidden text-left relative group
        bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.08]
        hover:border-red-500/30 transition-all duration-300"
    >
      <div className="aspect-video w-full bg-white/5 overflow-hidden relative">
        {channel.thumbnail_url && (
          <img
            src={channel.thumbnail_url}
            alt={channel.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
        {/* Live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
          </span>
        </div>
        {/* Viewer count */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5">
          <Eye size={10} className="text-white/70" />
          <span className="text-[10px] text-white/90 font-medium">
            {channel.viewer_count >= 1000
              ? `${(channel.viewer_count / 1000).toFixed(1)}K`
              : channel.viewer_count}
          </span>
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>
      <div className="p-3">
        <p className="text-xs text-white/90 font-semibold truncate">{channel.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-white/40 bg-white/[0.06] rounded-full px-2 py-0.5">
            {channel.category}
          </span>
          {channel.sale_type === 'auction' && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
              Auction
            </span>
          )}
          {channel.sale_type === 'drop' && (
            <span className="text-[10px] text-violet-400 bg-violet-500/10 rounded-full px-2 py-0.5">
              Drop
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Billboard Hero Carousel ─────────────────────────── */

const BADGE_STYLES: Record<string, string> = {
  amber: 'bg-amber-500/90 text-black',
  rose: 'bg-rose-500/90 text-white',
  indigo: 'bg-indigo-600 text-white',
  emerald: 'bg-emerald-500/90 text-white',
};

function BillboardHero({
  billboards,
  fallbackChannel,
  onWatchChannel,
  onViewProduct,
}: {
  billboards: BillboardPlacement[];
  fallbackChannel?: GatewayChannel;
  onWatchChannel: (id: string) => void;
  onViewProduct: (product: Product) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const impressionFired = useRef<Set<string>>(new Set());

  // Build unified slides: billboards first, then fallback channel
  const slides = billboards.length > 0 ? billboards : [];
  const showFallback = slides.length === 0 && fallbackChannel;

  // Auto-rotate every 8s
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  // Track impressions (fire once per billboard per session)
  useEffect(() => {
    if (slides.length === 0) return;
    const bb = slides[activeIndex];
    if (bb && !impressionFired.current.has(bb.id)) {
      impressionFired.current.add(bb.id);
      api.trackBillboardImpression(bb.id);
    }
  }, [activeIndex, slides]);

  const handleClick = (bb: BillboardPlacement) => {
    api.trackBillboardClick(bb.id);
    if (bb.targetType === 'channel' && bb.targetId) {
      onWatchChannel(bb.targetId);
    } else if (bb.targetType === 'product' && bb.targetProduct) {
      onViewProduct(bb.targetProduct as Product);
    }
  };

  // Fallback: show the original featured live channel
  if (showFallback) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative rounded-2xl overflow-hidden mb-6 cursor-pointer group"
        onClick={() => onWatchChannel(fallbackChannel!.id)}
      >
        <div className="aspect-[21/9] sm:aspect-[3/1] w-full bg-white/5 overflow-hidden relative">
          {fallbackChannel!.thumbnail_url && (
            <img
              src={fallbackChannel!.thumbnail_url}
              alt={fallbackChannel!.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F]/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Live Now
              </span>
              <span className="flex items-center gap-1 text-xs text-white/60">
                <Eye size={12} />
                {fallbackChannel!.viewer_count >= 1000
                  ? `${(fallbackChannel!.viewer_count / 1000).toFixed(1)}K watching`
                  : `${fallbackChannel!.viewer_count} watching`}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white leading-tight mb-1">
              {fallbackChannel!.title}
            </h2>
            <p className="text-sm text-white/50">{fallbackChannel!.category}</p>
            <button className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition-colors shadow-lg shadow-indigo-500/30">
              <Radio size={16} /> Watch Live
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (slides.length === 0) return null;

  const current = slides[activeIndex];
  const badgeClass = BADGE_STYLES[current.badgeColor] || BADGE_STYLES.indigo;

  // FTC compliance: sponsored always shows "Sponsored"
  const badgeLabel = current.billboardType === 'sponsored' ? 'Sponsored' : current.badgeText;
  const isLiveTarget = current.targetType === 'channel' && current.targetChannel?.status === 'LIVE';

  return (
    <div
      ref={heroRef}
      className="relative rounded-2xl overflow-hidden mb-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5 }}
          className="relative cursor-pointer group"
          onClick={() => handleClick(current)}
        >
          <div className="aspect-[21/9] sm:aspect-[3/1] w-full bg-white/5 overflow-hidden relative">
            <img
              src={current.imageUrl}
              alt={current.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F]/80 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                {/* Billboard type badge (FTC compliant) */}
                {badgeLabel && (
                  <span className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                    {current.billboardType === 'trending' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                    {badgeLabel}
                  </span>
                )}
                {/* Live indicator for channel targets */}
                {isLiveTarget && (
                  <>
                    <span className="flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Live
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/60">
                      <Eye size={12} />
                      {current.targetChannel!.viewer_count >= 1000
                        ? `${(current.targetChannel!.viewer_count / 1000).toFixed(1)}K watching`
                        : `${current.targetChannel!.viewer_count} watching`}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white leading-tight mb-0.5">
                {current.title}
              </h2>
              {current.subtitle && (
                <p className="text-sm text-white/60 mb-0.5">{current.subtitle}</p>
              )}
              {current.description && (
                <p className="text-xs text-white/40 hidden sm:block">{current.description}</p>
              )}
              <button className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition-colors shadow-lg shadow-indigo-500/30">
                {current.targetType === 'channel' ? <Radio size={16} /> : <Tag size={16} />}
                {current.ctaLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
          {slides.map((bb, i) => (
            <button
              key={bb.id}
              onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Progress bar for auto-rotation */}
      {slides.length > 1 && !paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <motion.div
            key={`progress-${activeIndex}`}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 8, ease: 'linear' }}
            className="h-full bg-indigo-500/60"
          />
        </div>
      )}
    </div>
  );
}

/* ── Category Pill ────────────────────────────────────── */
function CategoryPill({
  name, icon, count, isActive, onClick,
}: { name: string; icon: string; count: number; isActive: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
        transition-all duration-200 border ${
          isActive
            ? 'bg-indigo-600/90 text-white border-indigo-500/50 shadow-lg shadow-indigo-500/20'
            : 'bg-white/[0.05] text-white/60 border-white/[0.08] hover:bg-white/[0.1] hover:text-white/80'
        }`}
    >
      <span className="text-base">{icon}</span>
      <span>{name}</span>
      <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
        isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
      }`}>{count}</span>
    </motion.button>
  );
}

/* ── Deal Card (with discount badge) ──────────────────── */
function DealCard({ product, onClick }: { product: Product; onClick: () => void }) {
  // We don't have originalPrice in the mapped Product type, so we just show the price
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden text-left group relative
        bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.03] border border-emerald-500/[0.15]
        hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full
        bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
        <Tag size={10} /> Deal
      </div>
      <div className="aspect-square w-full bg-white/5 overflow-hidden">
        {product.mediaUrl && (
          <img
            src={product.mediaUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-white/90 font-medium truncate">{product.name}</p>
        <p className="text-sm text-emerald-400 font-bold mt-1">${product.price.toFixed(2)}</p>
      </div>
    </motion.button>
  );
}

/* ── Search Results Mode ──────────────────────────────── */
function SearchResults({
  products, loading, query, condition, sort, onViewProduct,
  onConditionChange, onSortChange,
}: {
  products: Product[];
  loading: boolean;
  query: string;
  condition: string;
  sort: api.MarketplaceSearchParams['sort'];
  onViewProduct: (p: Product) => void;
  onConditionChange: (c: string) => void;
  onSortChange: (s: api.MarketplaceSearchParams['sort']) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);
  return (
    <div className="px-4 pb-8">
      {/* Filter bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">
          {loading ? 'Searching...' : `${products.length} results for "${query}"`}
        </p>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-white/60
            hover:bg-white/10 hover:text-white/80 transition-colors"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 flex flex-wrap gap-2"
          >
            <div className="flex gap-1">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => onConditionChange(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    condition === c
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {c === 'like_new' ? 'Like New' : c === 'All' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as api.MarketplaceSearchParams['sort'])}
              className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white/80 outline-none"
            >
              {SORTS.map(s => (
                <option key={s.value} value={s.value} className="bg-gray-900">{s.label}</option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/5 animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Package size={48} className="mb-4" />
          <p className="text-sm font-medium">No products found</p>
          <p className="text-xs text-white/20 mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map(product => (
            <motion.button
              key={product.id}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onViewProduct(product)}
              className="rounded-2xl overflow-hidden text-left group relative
                bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/[0.08]
                hover:border-white/20 hover:shadow-lg transition-all duration-300"
            >
              {product.saleType === 'auction' && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full
                  bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-black">
                  <Gavel size={10} /> Bid
                </div>
              )}
              <div className="aspect-[4/5] w-full bg-white/5 overflow-hidden">
                {product.mediaUrl && (
                  <img
                    src={product.mediaUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm text-white/90 font-medium truncate">{product.name}</p>
                <p className="text-sm text-indigo-400 font-bold mt-1">${product.price.toFixed(2)}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ██  MAIN COMPONENT — Marketplace Gateway
   ══════════════════════════════════════════════════════════ */

export function MarketplaceBrowse({ onViewProduct, onOpenCart, onGoHome, cartCount, onWatchChannel, onOpenProfile, onOpenRail, onGoToCreatorStudio, onGoToLiveView, onGoToSellerProgram }: Props) {
  /* ── State ── */
  const [gateway, setGateway] = useState<MappedGateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [butterflyHovered, setButterflyHovered] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [condition, setCondition] = useState('All');
  const [sort, setSort] = useState<api.MarketplaceSearchParams['sort']>('relevance');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── Load gateway data ── */
  const useMockByDefault = import.meta.env.DEV || import.meta.env.VITE_FORCE_MOCK === 'true';

  useEffect(() => {
    // In development, use mock gateway immediately so the full UI is always visible.
    // The backend likely has sparse/empty data — mock lets you see and refine the UX.
    if (useMockByDefault) {
      setGateway(MOCK_GATEWAY as MappedGateway);
      setLoading(false);
      return;
    }

    // Production: fetch real data, only fall back to mock on network failure
    setLoading(true);
    api.getMarketplaceGateway()
      .then(setGateway)
      .catch(() => {
        // Backend truly unreachable — show mock so the page isn't blank
        setGateway(MOCK_GATEWAY as MappedGateway);
      })
      .finally(() => setLoading(false));
  }, [useMockByDefault]);

  /* ── Search ── */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearchLoading(true);
    setSearchActive(true);
    try {
      if (useMockByDefault) {
        setSearchResults(mockSearch(q, activeCategory));
      } else {
        const params: api.MarketplaceSearchParams = { q, sort, limit: 40 };
        if (condition !== 'All') params.condition = condition;
        if (activeCategory && activeCategory !== 'All') params.category = activeCategory;
        const results = await api.searchProducts(params);
        setSearchResults(results);
      }
    } catch {
      // Network error in prod — fall back to local search
      setSearchResults(mockSearch(q, activeCategory));
    } finally {
      setSearchLoading(false);
    }
  }, [sort, condition, activeCategory, useMockByDefault]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchActive(false);
    setSearchResults([]);
  };

  /* ── Category filter ── */
  const handleCategoryClick = (name: string) => {
    if (activeCategory === name) {
      setActiveCategory(null);
    } else {
      setActiveCategory(name);
      setSearchLoading(true);
      setSearchActive(true);

      if (useMockByDefault) {
        setSearchResults(mockSearch('', name));
        setQuery('');
        setSearchLoading(false);
      } else {
        api.searchProducts({ category: name, sort, limit: 40 })
          .then(results => {
            setSearchResults(results);
            setQuery('');
          })
          .catch(() => {
            setSearchResults(mockSearch('', name));
            setQuery('');
          })
          .finally(() => setSearchLoading(false));
      }
    }
  };

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-5 w-28 rounded bg-white/5 animate-pulse" />
          <div className="flex-1" />
          <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
        </header>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          <div className="h-48 rounded-2xl bg-white/5 animate-pulse" />
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-28 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
            ))}
          </div>
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-44 aspect-[4/5] rounded-2xl bg-white/5 animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const gw = gateway!;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
      {/* ── Header ── */}
      <header className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-white/[0.06]
        bg-[#0A0A0F]/80 backdrop-blur-xl sticky top-0 z-50">
        {/* Home / back to Shop */}
        <button
          onClick={onGoHome}
          className="p-2 rounded-xl hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors"
          title="Home"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Search bar — reduced width */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm relative">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08]
            px-3 py-2 focus-within:border-indigo-500/50 focus-within:bg-white/[0.08] transition-all">
            <Search size={14} className="text-white/30" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands, categories..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none min-w-0"
            />
            {(query || searchActive) && (
              <button type="button" onClick={clearSearch} className="text-white/30 hover:text-white/60">
                <X size={14} />
              </button>
            )}
          </div>
        </form>

        {/* CTA links — centered */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={onGoToSellerProgram}
            className="text-xs font-semibold text-white/40 hover:text-indigo-400 transition-colors whitespace-nowrap"
            title="Apply to sell products on Greggie Marketplace"
          >
            Become a Seller
          </button>
          <span className="text-white/15">|</span>
          <button
            onClick={onGoToCreatorStudio}
            className="text-xs font-semibold text-white/40 hover:text-indigo-400 transition-colors whitespace-nowrap"
            title="Start streaming and selling live on Greggie"
          >
            Start a Channel
          </button>
        </div>

        {/* Spacer to push icons right */}
        <div className="flex-1" />

        {/* Nav icons — right side */}
        <div className="flex items-center gap-1">
          {/* LiveView */}
          <button
            onClick={onGoToLiveView}
            className="p-2 rounded-xl hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors"
            title="Live Channels"
          >
            <Tv size={18} />
          </button>

          {/* Creator Studio */}
          <button
            onClick={onGoToCreatorStudio}
            className="p-2 rounded-xl hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors"
            title="Creator Studio"
          >
            <Radio size={18} />
          </button>

          {/* Sell on Greggie */}
          <button
            onClick={onGoToSellerProgram}
            className="p-2 rounded-xl hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors"
            title="Sell on Greggie"
          >
            <Store size={18} />
          </button>

          {/* Categories dropdown */}
          <div className="relative">
            <button
              onClick={() => setCategoriesOpen(prev => !prev)}
              className={`flex items-center gap-1 p-2 rounded-xl hover:bg-white/[0.08] transition-colors ${
                categoriesOpen ? 'text-white bg-white/[0.08]' : 'text-white/50 hover:text-white'
              }`}
              title="Categories"
            >
              <LayoutGrid size={18} />
              <ChevronDown size={14} className={`transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {categoriesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#1A1A2E] border border-white/[0.08]
                    shadow-2xl shadow-black/60 overflow-hidden z-[60]"
                >
                  <div className="px-3 py-2 border-b border-white/[0.06]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Browse Categories</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {gateway?.categories.map(cat => (
                      <button
                        key={cat.name}
                        onClick={() => { handleCategoryClick(cat.name); setCategoriesOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                          activeCategory === cat.name
                            ? 'bg-indigo-600/20 text-indigo-300'
                            : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="flex-1 text-left">{cat.name}</span>
                        <span className={`text-[11px] rounded-full px-2 py-0.5 ${
                          activeCategory === cat.name
                            ? 'bg-indigo-500/30 text-indigo-200'
                            : 'bg-white/[0.06] text-white/40'
                        }`}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Click-away to close */}
            {categoriesOpen && (
              <div className="fixed inset-0 z-[55]" onClick={() => setCategoriesOpen(false)} />
            )}
          </div>

          {/* Profile */}
          <button
            onClick={onOpenProfile}
            className="p-2 rounded-xl hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors"
            title="Profile"
          >
            <User size={18} />
          </button>

          {/* Butterfly Cart — animated */}
          <button
            onClick={onOpenCart}
            onMouseEnter={() => setButterflyHovered(true)}
            onMouseLeave={() => setButterflyHovered(false)}
            className="relative p-2 rounded-xl hover:bg-white/[0.08] transition-colors"
            style={cartCount > 0 ? {
              filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.7)) drop-shadow(0 0 24px rgba(99, 102, 241, 0.4))',
            } : undefined}
            title="Cart"
          >
            <ButterflyIcon size={20} hovered={butterflyHovered || cartCount > 0} />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full
                  bg-green-500 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(16,185,129,0.6)]"
              >
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {searchActive ? (
          <SearchResults
            products={searchResults}
            loading={searchLoading}
            query={activeCategory && !query ? activeCategory : query}
            condition={condition}
            sort={sort}
            onViewProduct={onViewProduct}
            onConditionChange={setCondition}
            onSortChange={(s) => { setSort(s); doSearch(query); }}
          />
        ) : (
          <div className="px-4 sm:px-6 py-4 space-y-8">
            {/* ── Billboard Hero ── */}
            <BillboardHero
              billboards={gw.billboards ?? []}
              fallbackChannel={gw.featuredLive}
              onWatchChannel={(id) => onWatchChannel?.(id)}
              onViewProduct={onViewProduct}
            />

            {/* ── Categories ── */}
            {gw.categories.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Star size={16} />}
                  title="Browse Categories"
                  accent="indigo"
                />
                <ScrollRow>
                  {gw.categories.map(cat => (
                    <CategoryPill
                      key={cat.name}
                      name={cat.name}
                      icon={cat.icon}
                      count={cat.count}
                      isActive={activeCategory === cat.name}
                      onClick={() => handleCategoryClick(cat.name)}
                    />
                  ))}
                </ScrollRow>
              </section>
            )}

            {/* ── Live Channels ── */}
            {gw.liveChannels.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Radio size={16} />}
                  title="Live Now"
                  accent="rose"
                />
                <ScrollRow>
                  {gw.liveChannels.map(ch => (
                    <LiveChannelCard
                      key={ch.id}
                      channel={ch}
                      onClick={() => onWatchChannel?.(ch.id)}
                    />
                  ))}
                </ScrollRow>
              </section>
            )}

            {/* ── Trending ── */}
            {gw.trending.length > 0 && (
              <section>
                <SectionHeader
                  icon={<TrendingUp size={16} />}
                  title="Trending Now"
                  accent="indigo"
                />
                <ScrollRow>
                  {gw.trending.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => onViewProduct(product)}
                      size="md"
                      rank={i + 1}
                    />
                  ))}
                </ScrollRow>
              </section>
            )}

            {/* ── Hot Deals ── */}
            {gw.deals.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Flame size={16} />}
                  title="Hot Deals"
                  accent="emerald"
                />
                <ScrollRow>
                  {gw.deals.map(product => (
                    <DealCard
                      key={product.id}
                      product={product}
                      onClick={() => onViewProduct(product)}
                    />
                  ))}
                </ScrollRow>
              </section>
            )}

            {/* ── Auctions ── */}
            {gw.auctions.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Gavel size={16} />}
                  title="Live Auctions"
                  accent="amber"
                />
                <ScrollRow>
                  {gw.auctions.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => onViewProduct(product)}
                      size="md"
                    />
                  ))}
                </ScrollRow>
              </section>
            )}

            {/* ── Drops ── */}
            {gw.drops.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Zap size={16} />}
                  title="Exclusive Drops"
                  accent="violet"
                />
                <ScrollRow>
                  {gw.drops.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => onViewProduct(product)}
                      size="md"
                    />
                  ))}
                </ScrollRow>
              </section>
            )}

            {/* ── New Arrivals ── */}
            {gw.newArrivals.length > 0 && (
              <section>
                <SectionHeader
                  icon={<Sparkles size={16} />}
                  title="Just Arrived"
                  accent="cyan"
                />
                <ScrollRow>
                  {gw.newArrivals.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => onViewProduct(product)}
                      size="md"
                    />
                  ))}
                </ScrollRow>
              </section>
            )}

            {/* ── Quick Picks Grid ── */}
            <section>
              <SectionHeader
                icon={<Package size={16} />}
                title="Explore All"
                accent="orange"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-8">
                {[...gw.trending, ...gw.newArrivals, ...gw.deals]
                  .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i) // dedupe
                  .map(product => (
                    <motion.button
                      key={product.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onViewProduct(product)}
                      className="rounded-2xl overflow-hidden text-left group
                        bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.06]
                        hover:border-white/15 transition-all duration-300"
                    >
                      <div className="aspect-square w-full bg-white/5 overflow-hidden">
                        {product.mediaUrl && (
                          <img
                            src={product.mediaUrl}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500
                              group-hover:scale-110"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs text-white/80 font-medium truncate">{product.name}</p>
                        <p className="text-sm text-white font-bold mt-0.5">${product.price.toFixed(2)}</p>
                      </div>
                    </motion.button>
                  ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
