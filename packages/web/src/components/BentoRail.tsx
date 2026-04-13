import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Channel, CATEGORIES } from '../data/mockData';
import { X, Sparkles, Eye, ChevronLeft, Radio } from 'lucide-react';

type BentoRailProps = {
  channels: Channel[];
  currentChannelId: string;
  onSelectChannel: (channel: Channel) => void;
  onClose: () => void;
};

/* ── Helpers ── */
function fmtViewers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function thumbUrl(url: string) {
  // Don't try to manipulate video URLs — they can't be displayed as images
  if (!url || url.endsWith('.mp4') || url.endsWith('.m3u8') || url.includes('/videos/')) {
    return '';
  }
  return url.replace(/w=\d+/, 'w=320').replace(/h=\d+/, 'h=180');
}

const BADGE_COLORS: Record<string, string> = {
  EXCLUSIVE: 'from-purple-500 to-indigo-500',
  FLASH: 'from-rose-500 to-pink-500',
  REPLAY: 'from-indigo-500 to-blue-500',
  TRENDING: 'from-pink-500 to-orange-400',
  ART: 'from-emerald-500 to-teal-500',
  HYPE: 'from-red-500 to-amber-500',
  LUXURY: 'from-amber-300 to-yellow-200',
  PREMIUM: 'from-amber-500 to-orange-500',
  GLOBAL: 'from-cyan-500 to-blue-500',
  DROP: 'from-lime-400 to-green-500',
  CREATIVE: 'from-violet-500 to-purple-500',
};

const STATUS_DOT: Record<string, string> = {
  LIVE: 'bg-red-500 shadow-red-500/50',
  RELAY: 'bg-indigo-400 shadow-indigo-400/50',
  SCHEDULED: 'bg-gray-400 shadow-gray-400/50',
  VOD: 'bg-purple-400 shadow-purple-400/50',
};

export function BentoRail({ channels, currentChannelId, onSelectChannel, onClose }: BentoRailProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const categories = CATEGORIES.filter(c => c !== 'All');

  const { primary, list } = useMemo(() => {
    const p = channels.find(c => c.isPrimary) ?? null;
    let rest = channels.filter(c => !c.isPrimary);
    if (selectedCategory) rest = rest.filter(c => c.category === selectedCategory);
    const showPrimary = !selectedCategory || p?.category === selectedCategory;
    return { primary: showPrimary ? p : null, list: rest };
  }, [channels, selectedCategory]);

  /* Scroll the active channel into view on mount */
  useEffect(() => {
    requestAnimationFrame(() => {
      activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, []);

  const allItems = primary ? [primary, ...list] : list;

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 bottom-0 z-40 flex w-full sm:w-[360px] flex-col
                 border-l border-white/[0.06] bg-black/80 backdrop-blur-2xl"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full
                     bg-white/[0.06] text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-bold tracking-wide text-white/90 uppercase">Channels</h2>
          <p className="text-[11px] text-white/40">{channels.length} live &amp; upcoming</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full
                     text-white/30 transition hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Category filter ── */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-all
            ${selectedCategory === null
              ? 'bg-white text-black'
              : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/80'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-all
              ${selectedCategory === cat
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/80'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 h-px bg-white/[0.06]" />

      {/* ── Channel list ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-2">
        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <p className="text-sm text-white/40">No channels in this category</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-2">
            {allItems.map((channel, i) => {
              const isActive = channel.id === currentChannelId;
              const isPrimary = !!channel.isPrimary;

              return (
                <motion.button
                  key={channel.id}
                  ref={isActive ? activeRef : undefined}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onSelectChannel(channel)}
                  className={`group relative flex gap-3 rounded-xl p-2 text-left transition-all
                    ${isActive
                      ? 'bg-white/[0.08] ring-1 ring-white/[0.12]'
                      : 'hover:bg-white/[0.04]'}`}
                >
                  {/* Thumbnail — status + viewers only */}
                  <div
                    className="relative shrink-0 overflow-hidden rounded-lg bg-white/[0.06]"
                    style={{ width: isPrimary ? 130 : 110, height: isPrimary ? 74 : 62 }}
                  >
                    {thumbUrl(channel.thumbnailUrl || channel.streamUrl) ? (
                      <img
                        src={thumbUrl(channel.thumbnailUrl || channel.streamUrl)}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : channel.type === 'LIVE' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-600/30 via-indigo-600/20 to-purple-600/30">
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative">
                            <Radio size={22} className="text-white/60" />
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50" />
                          </div>
                          <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Streaming</span>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                        <Radio size={20} className="text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Status pill — top-left */}
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                      <span className={`h-1.5 w-1.5 rounded-full shadow-sm ${STATUS_DOT[channel.type] ?? STATUS_DOT.LIVE}`} />
                      <span className="text-[11px] font-bold text-white uppercase tracking-wide leading-none">
                        {channel.type === 'SCHEDULED' ? 'Soon' : channel.type}
                      </span>
                    </div>

                    {/* Viewer count — bottom-right */}
                    {channel.viewers > 0 && (
                      <div className="absolute bottom-1 right-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 backdrop-blur-sm">
                        <Eye size={8} className="text-white/70" />
                        <span className="text-[11px] font-bold text-white/90 leading-none">{fmtViewers(channel.viewers)}</span>
                      </div>
                    )}

                    {/* Featured tag for primary */}
                    {isPrimary && (
                      <div className="absolute top-1.5 right-1.5">
                        <span className="flex items-center gap-0.5 rounded bg-gradient-to-r from-amber-400 to-yellow-300 px-1 py-px text-[8px] font-black text-black leading-none">
                          <Sparkles size={7} />
                          FEATURED
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info — right side only: title, creator, badge, product */}
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
                    <h3 className={`font-semibold leading-tight truncate transition-colors
                      ${isPrimary ? 'text-[13px] text-white' : 'text-xs text-white/85 group-hover:text-white'}`}>
                      {channel.title}
                    </h3>
                    <span className="text-[11px] text-white/40 truncate">{channel.merchant.name}</span>
                    {channel.badge && (
                      <span className={`mt-0.5 w-fit rounded px-1.5 py-px text-[11px] font-bold uppercase tracking-wider leading-none
                        bg-gradient-to-r ${BADGE_COLORS[channel.badge] ?? 'from-gray-500 to-gray-400'}
                        ${channel.badge === 'LUXURY' ? 'text-black' : 'text-white'}`}>
                        {channel.badge}
                      </span>
                    )}
                    {channel.products.length > 0 && (
                      <p className="mt-0.5 text-xs text-white/30 truncate">
                        {channel.products[0].name}
                        {channel.products.length > 1 && ` +${channel.products.length - 1}`}
                      </p>
                    )}
                  </div>

                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-indigo-500" />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom fade ── */}
      <div className="pointer-events-none h-8 bg-gradient-to-t from-black/80 to-transparent" />
    </motion.aside>
  );
}
