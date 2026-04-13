import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Channel, Product } from '../data/mockData';
import { Heart, Share2, MessageCircle, Sparkles, X, Send, User, Gavel, Timer, Gift, HelpCircle, Bell, BellRing, ChevronUp, ChevronDown, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { ButterflyIcon } from './ButterflyIcon';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShareSheet } from './ShareSheet';
import { Countdown } from './Countdown';
import { searchRelay, getDisplayName, type RelayMatch } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';
import { HlsPlayer, type HlsPlayerHandle } from './HlsPlayer';

type LiveViewProps = {
  channel: Channel;
  onBuy: (product: Product) => void;
  onViewProduct?: (product: Product) => void;
  onOpenRail: () => void;
  onOpenProfile: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  isPiP?: boolean;
  feedType?: 'FOR_YOU' | 'FOLLOWING';
  onChangeFeedType?: (type: 'FOR_YOU' | 'FOLLOWING') => void;
  followedChannels?: Record<string, boolean>;
  onToggleFollow?: (channelId: string) => void;
  onGoHome?: () => void;
  onGoToShop?: () => void;
  onOpenCart?: () => void;
  cartCount?: number;
  onGoToSellerProgram?: () => void;
  onGoToCreatorStudio?: () => void;
};

export function LiveView({ 
  channel, 
  onBuy, 
  onViewProduct,
  onOpenRail, 
  onOpenProfile, 
  onNextChannel, 
  onPrevChannel, 
  isPiP = false,
  feedType = 'FOR_YOU',
  onChangeFeedType,
  followedChannels = {},
  onToggleFollow,
  onGoHome,
  onGoToShop,
  onOpenCart,
  cartCount = 0,
  onGoToSellerProgram,
  onGoToCreatorStudio
}: LiveViewProps) {
  const isVOD = channel.type === 'VOD';

  type LiveMessage = {
    id: string;
    user: string;
    text: string;
    isSystem?: boolean;
    isQuestion?: boolean;
  };

  const [butterflyHovered, setButterflyHovered] = useState(false);
  const [showRelayQuery, setShowRelayQuery] = useState(false);
  const [query, setQuery] = useState('');
  const [relayStatus, setRelayStatus] = useState<'idle' | 'searching' | 'found' | 'empty'>('idle');
  const [relayMatches, setRelayMatches] = useState<RelayMatch[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  
  // Gifting & Q&A state
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [activeGifts, setActiveGifts] = useState<{id: number, gift: {name: string, icon: string, price: number}}[]>([]);
  const [isAskMode, setIsAskMode] = useState(false);
  const [reminderSet, setReminderSet] = useState<Record<string, boolean>>({});
  const [pinnedQuestion, setPinnedQuestion] = useState<{user: string, text: string} | null>(null);

  // WebSocket: subscribe to channel and listen for incoming chat messages
  const { sendChat, sendHeart, on: wsOn } = useWebSocket();
  const { user } = useAuth();
  const displayName = useMemo(() => getDisplayName(user), [user]);

  // Clear messages when switching channels
  useEffect(() => {
    setMessages([]);
    setLikeCount(0);
  }, [channel.id]);

  // Hydrate state when joining a channel (chat history, likes, viewer count)
  useEffect(() => {
    return wsOn('channel:state', (msg) => {
      try {
        const data = msg.payload as { channel_id: string; chat_history: string[]; likes: number; viewers: number };
        if (data.channel_id !== channel.id) return;

        // Hydrate likes
        if (data.likes > 0) setLikeCount(data.likes);

        // Hydrate chat history — each entry is a raw JSON chat:message WS frame
        if (data.chat_history?.length > 0) {
          const hydrated: LiveMessage[] = [];
          for (const raw of data.chat_history) {
            try {
              const frame = typeof raw === 'string' ? JSON.parse(raw) : raw;
              const payload = typeof frame.payload === 'string' ? JSON.parse(frame.payload) : frame.payload;
              hydrated.push({
                id: Math.random().toString(36),
                user: payload.user ?? 'Viewer',
                text: payload.text,
              });
            } catch { /* skip malformed */ }
          }
          if (hydrated.length > 0) setMessages(hydrated);
        }
      } catch { /* ignore */ }
    });
  }, [wsOn, channel.id]);

  useEffect(() => {
    return wsOn('chat:message', (msg) => {
      try {
        const data = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), user: data.user ?? 'Viewer', text: data.text },
        ]);
      } catch { /* ignore malformed */ }
    });
  }, [wsOn]);

  // Listen for heart bursts — update total count from server
  useEffect(() => {
    return wsOn('heart:burst', (msg) => {
      const data = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
      if (data.count != null) {
        setLikeCount(data.count);
      } else {
        setLikeCount(prev => prev + 1);
      }
      const newHeart = {
        id: Date.now() + Math.random(),
        x: (Math.random() - 0.5) * 60,
      };
      setHearts(prev => [...prev, newHeart]);
      setTimeout(() => {
        setHearts(prev => prev.filter(h => h.id !== newHeart.id));
      }, 2000);
    });
  }, [wsOn]);

  const fallbackScheduledTime = useMemo(() => {
    return new Date(Date.now() + 86400000).toISOString();
  }, []);

  const GIFTS = [
    { id: 'rose', name: 'Rose', icon: '🌹', price: 1 },
    { id: 'coffee', name: 'Coffee', icon: '☕', price: 3 },
    { id: 'diamond', name: 'Diamond', icon: '💎', price: 10 },
    { id: 'rocket', name: 'Rocket', icon: '🚀', price: 50 },
  ];

  const handleSendGift = (gift: typeof GIFTS[0]) => {
    setShowGiftMenu(false);
    const newGift = { id: Date.now(), gift };
    setActiveGifts(prev => [...prev, newGift]);
    
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), user: displayName, text: `Sent a ${gift.name} ${gift.icon}`, isSystem: true }
    ]);

    setTimeout(() => {
      setActiveGifts(prev => prev.filter(g => g.id !== newGift.id));
    }, 4000);
  };

  // Simulate bids for auctions
  useEffect(() => {
    const hasAuction = channel.products.some(p => p.saleType === 'auction');
    if (hasAuction) {
      const interval = setInterval(() => {
        const newBidder = ['User123', 'Collector99', 'PokeFan', 'CardKing'][Math.floor(Math.random() * 4)];
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString(), user: 'System', text: `🚨 ${newBidder} placed a new bid!`, isSystem: true }
        ]);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [channel]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Broadcast heart to all viewers via WebSocket
    sendHeart(channel.id, displayName);
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isPiP) return;
    
    const swipeThreshold = 50;
    if (info.offset.y < -swipeThreshold && onNextChannel) {
      onNextChannel();
    } else if (info.offset.y > swipeThreshold && onPrevChannel) {
      onPrevChannel();
    }
  };

  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsPlayerRef = useRef<HlsPlayerHandle>(null);
  const [isStreamLive, setIsStreamLive] = useState(false);
  const [isCinematic, setIsCinematic] = useState(false);
  const [showUnmuteHint, setShowUnmuteHint] = useState(true);

  const isHlsStream = channel.streamUrl?.includes('.m3u8') || /\.(mp4|webm|ogg)(\?|$)/i.test(channel.streamUrl ?? '');

  // Close avatar menu when switching channels
  useEffect(() => {
    setShowAvatarMenu(false);
  }, [channel.id]);

  const handleMouseActivity = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <motion.div 
      className="relative h-full w-full bg-black text-white"
      drag={!isPiP ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onMouseMove={handleMouseActivity}
      onMouseEnter={handleMouseActivity}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Player (Animates to PiP) */}
      <motion.div
        layout
        className={
          isPiP
            ? "fixed top-4 right-4 z-40 h-48 w-32 overflow-hidden rounded-xl border-2 border-white/20 bg-black shadow-2xl"
            : "absolute inset-0 h-full w-full"
        }
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {isHlsStream ? (
          <HlsPlayer
            ref={hlsPlayerRef}
            src={channel.streamUrl}
            muted={isMuted}
            className="h-full w-full object-cover pointer-events-none"
            poster={channel.streamUrl.replace(/\/[^/]+\/index\.m3u8$/, '') ? undefined : undefined}
            onStreamReady={() => setIsStreamLive(true)}
            onStreamError={() => setIsStreamLive(false)}
          />
        ) : (
          <img
            src={channel.streamUrl}
            alt={channel.title}
            className="h-full w-full object-cover opacity-80 pointer-events-none"
          />
        )}
        {!isStreamLive && isHlsStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="text-sm text-white/70">Connecting to stream...</span>
            </div>
          </div>
        )}
        {/* Tap to unmute hint */}
        {isStreamLive && isMuted && showUnmuteHint && !isPiP && (
          <button
            onClick={() => {
              setIsMuted(false);
              hlsPlayerRef.current?.setMuted(false);
              hlsPlayerRef.current?.setVolume(volume / 100);
              setShowUnmuteHint(false);
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 backdrop-blur-md border border-white/20 text-white/90 text-sm font-medium hover:bg-black/80 transition-colors"
          >
            <VolumeX size={16} />
            Tap to unmute
          </button>
        )}
        {isPiP && (
          <div className={`absolute top-2 left-2 rounded px-1.5 py-0.5 text-xs font-bold text-white ${
            channel.type === 'LIVE' ? 'bg-red-600' : channel.type === 'VOD' ? 'bg-purple-600' : channel.type === 'SCHEDULED' ? 'bg-gray-600' : 'bg-indigo-600'
          }`}>
            {channel.type}
          </div>
        )}
      </motion.div>

      {/* UI Overlay (Hidden when in PiP mode, fades in cinematic) */}
      <AnimatePresence>
        {!isPiP && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Cinematic mode: hide everything except controls on hover */}
            <motion.div
              animate={{ opacity: isCinematic && !showControls ? 0 : 1 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 pointer-events-none"
            >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

            {/* Massive Gift Animations */}
            <AnimatePresence>
              {activeGifts.map(({ id, gift }) => (
                <motion.div
                  key={id}
                  initial={{ scale: 0, opacity: 0, y: 100 }}
                  animate={{ scale: [0, 2, 1.5], opacity: [0, 1, 0], y: -200 }}
                  transition={{ duration: 3, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                >
                  <div className="flex flex-col items-center drop-shadow-2xl">
                    <span className="text-9xl">{gift.icon}</span>
                    <span className="mt-4 rounded-full bg-black/50 px-4 py-1 text-lg font-bold text-white backdrop-blur-md">
                      You sent a {gift.name}!
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex items-center justify-between pointer-events-auto">
              {/* Home button */}
              <button
                onClick={onGoHome}
                className="absolute top-3 left-4 rounded-full bg-white/10 p-2.5 backdrop-blur-md transition-colors hover:bg-white/20 z-10"
                title="Back to Splash"
              >
                <ButterflyIcon size={24} />
              </button>
              {/* Following / For You / Shop Tabs */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 drop-shadow-md max-w-[calc(100vw-2rem)] overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => onChangeFeedType?.('FOLLOWING')}
                  className={`shrink-0 text-sm sm:text-lg font-bold transition-colors relative ${feedType === 'FOLLOWING' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                >
                  Following
                  {feedType === 'FOLLOWING' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full" />}
                </button>
                <div className="h-4 w-px bg-white/30 shrink-0" />
                <button
                  onClick={() => onChangeFeedType?.('FOR_YOU')}
                  className={`shrink-0 text-sm sm:text-lg font-bold transition-colors relative ${feedType === 'FOR_YOU' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                >
                  For You
                  {feedType === 'FOR_YOU' && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full" />}
                </button>
                <div className="h-4 w-px bg-white/30 shrink-0" />
                <button
                  onClick={() => onGoToShop?.()}
                  className="shrink-0 text-sm sm:text-lg font-bold transition-colors relative text-white/60 hover:text-white"
                >
                  Shop
                </button>
                <div className="h-4 w-px bg-white/30 shrink-0" />
                <button
                  onClick={() => onGoToSellerProgram?.()}
                  className="shrink-0 text-sm sm:text-lg font-bold transition-colors relative text-white/60 hover:text-white"
                >
                  Sell
                </button>
                <div className="h-4 w-px bg-white/30 shrink-0" />
                <button
                  onClick={() => onGoToCreatorStudio?.()}
                  className="shrink-0 text-sm sm:text-lg font-bold transition-colors relative text-white/60 hover:text-white"
                >
                  Create
                </button>
              </div>

              <div className="flex flex-col items-center gap-1.5 ml-14">
                {/* Channel name above status */}
                <motion.h2
                  key={channel.title}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-bold text-sm leading-tight drop-shadow-md text-white/90 text-center max-w-[200px] truncate"
                >
                  {channel.title}
                </motion.h2>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={channel.type}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-white shadow-sm ${
                        channel.type === 'LIVE' ? 'bg-red-600' : channel.type === 'SCHEDULED' ? 'bg-gray-600' : channel.type === 'VOD' ? 'bg-purple-600' : 'bg-indigo-600'
                      }`}
                    >
                      {channel.type === 'LIVE' ? (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                      )}
                      <span className="tracking-wide font-bold">{channel.type === 'SCHEDULED' ? 'UPCOMING' : channel.type}</span>
                    </motion.span>
                  </AnimatePresence>
                  {channel.isPrimary && (
                    <span className="flex items-center gap-1 rounded bg-gradient-to-r from-amber-500 to-yellow-400 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-amber-500/30">
                      <Sparkles size={10} />
                      SPONSORED
                    </span>
                  )}
                  {channel.type !== 'SCHEDULED' && (
                    <span className="text-white/90 drop-shadow-sm font-semibold">{channel.viewers.toLocaleString()} viewers</span>
                  )}
                </div>
                {/* Mascot → Avatar → Username vertical stack */}
                <div className="relative flex flex-col items-center gap-1 mt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(prev => !prev); }}
                    className="relative"
                  >
                    <motion.img
                      key={channel.merchant.avatar}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      src={channel.merchant.avatar}
                      alt={channel.merchant.name}
                      className="h-12 w-12 rounded-full border-2 border-white/30 shadow-lg object-cover hover:border-indigo-400 transition-colors"
                    />
                  </button>
                  <span className="text-xs font-bold text-white drop-shadow-md text-center max-w-[100px] truncate">{channel.merchant.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFollow?.(channel.id);
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors shadow-sm ${
                      followedChannels[channel.id]
                        ? 'bg-white/20 text-white backdrop-blur-md'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {followedChannels[channel.id] ? 'Following' : 'Follow'}
                  </button>
                  {/* Avatar dropdown menu */}
                  <AnimatePresence>
                    {showAvatarMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-2 w-44 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50"
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); onOpenProfile(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/90 hover:bg-white/10 transition-colors"
                        >
                          <User size={16} className="text-indigo-400" />
                          <span className="font-medium">Profile</span>
                        </button>
                        <div className="mx-3 h-px bg-white/[0.06]" />
                        <div className="flex items-center gap-3 px-4 py-3 text-sm text-white/70">
                          <Bell size={16} className="text-amber-400" />
                          <span className="font-medium">Subscribers</span>
                          <span className="ml-auto text-xs font-bold text-white/50">—</span>
                        </div>
                        <div className="mx-3 h-px bg-white/[0.06]" />
                        <div className="flex items-center gap-3 px-4 py-3 text-sm text-white/70">
                          <BellRing size={16} className="text-emerald-400" />
                          <span className="font-medium">Followers</span>
                          <span className="ml-auto text-xs font-bold text-white/50">—</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenCart}
                  onMouseEnter={() => setButterflyHovered(true)}
                  onMouseLeave={() => setButterflyHovered(false)}
                  className="relative rounded-full bg-white/10 p-2 backdrop-blur-md transition-colors hover:bg-white/20"
                  style={(butterflyHovered || cartCount > 0) ? {
                    filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.7)) drop-shadow(0 0 20px rgba(99, 102, 241, 0.4))',
                  } : undefined}
                >
                  <ButterflyIcon size={20} hovered={butterflyHovered || cartCount > 0} />
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </button>
                <button
                  onClick={onOpenProfile}
                  className="rounded-full bg-white/10 p-2 backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  <User size={20} className="text-white" />
                </button>
                <button
                  onClick={onOpenRail}
                  className="rounded-full bg-white/10 p-2 backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  <div className="flex flex-col gap-1">
                    <span className="h-1 w-5 rounded-full bg-white" />
                    <span className="h-1 w-4 rounded-full bg-white" />
                    <span className="h-1 w-5 rounded-full bg-white" />
                  </div>
                </button>
              </div>
            </div>

            {channel.type === 'SCHEDULED' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto z-30">
                {/* Nav arrows for scheduled channels */}
                {onPrevChannel && (
                  <button
                    onClick={onPrevChannel}
                    className="absolute left-1/2 top-20 -translate-x-1/2 z-40 rounded-full bg-black/40 p-2 backdrop-blur-md text-white/80 hover:bg-black/60 hover:text-white transition-colors"
                  >
                    <ChevronUp size={28} />
                  </button>
                )}
                {onNextChannel && (
                  <button
                    onClick={onNextChannel}
                    className="absolute left-1/2 bottom-10 -translate-x-1/2 z-40 rounded-full bg-black/40 p-2 backdrop-blur-md text-white/80 hover:bg-black/60 hover:text-white transition-colors"
                  >
                    <ChevronDown size={28} />
                  </button>
                )}

                <div className="flex flex-col items-center p-8 text-center mt-20">
                  <div className="mb-6 rounded-3xl bg-white/10 p-8 backdrop-blur-xl border border-white/20 shadow-2xl">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">Starts In</h3>
                    <Countdown 
                      endTime={channel.scheduledStartTime || fallbackScheduledTime} 
                      className="font-mono text-5xl font-black text-white tracking-tight drop-shadow-lg"
                    />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-3 drop-shadow-lg">{channel.title}</h2>
                  <p className="text-lg text-white/80 mb-10 max-w-sm font-medium drop-shadow-md">
                    {channel.products.length} exclusive items dropping in this event. Don't miss out!
                  </p>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReminderSet(prev => ({ ...prev, [channel.id]: !prev[channel.id] }));
                    }}
                    className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl ${
                      reminderSet[channel.id] 
                        ? 'bg-white/20 text-white border border-white/30' 
                        : 'bg-white text-black hover:scale-105 active:scale-95'
                    }`}
                  >
                    {reminderSet[channel.id] ? <BellRing size={24} /> : <Bell size={24} />}
                    {reminderSet[channel.id] ? 'Reminder Set' : 'Remind Me'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Relay AI Layer */}
                {channel.type === 'RELAY' && (
                  <div className="absolute top-28 left-4 right-4 z-20 pointer-events-auto">
                    <button
                      onClick={() => setShowRelayQuery(!showRelayQuery)}
                      className="flex items-center gap-2 rounded-full bg-indigo-600/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-md shadow-lg border border-indigo-400/30"
                    >
                      <Sparkles size={16} className="text-indigo-200" />
                      Ask Relay AI
                    </button>
                    
                    <AnimatePresence>
                      {showRelayQuery && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="mt-3 flex flex-col gap-3 rounded-2xl bg-black/80 p-4 backdrop-blur-xl border border-white/10 shadow-2xl max-h-72 overflow-hidden"
                        >
                          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                            {/* System greeting */}
                            <div className="flex gap-2">
                              <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center">
                                <Sparkles size={12} className="text-white" />
                              </div>
                              <div className="rounded-2xl rounded-tl-none bg-white/10 px-3 py-2 text-sm text-white/90">
                                Hi! I'm Relay AI. Ask me anything about the products in this stream.
                              </div>
                            </div>

                            {/* Searching indicator */}
                            {relayStatus === 'searching' && (
                              <div className="flex gap-2">
                                <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center">
                                  <Sparkles size={12} className="text-white" />
                                </div>
                                <div className="rounded-2xl rounded-tl-none bg-indigo-500/20 border border-indigo-500/30 px-3 py-2 text-sm text-indigo-100">
                                  <span className="animate-pulse">Searching transcript...</span>
                                </div>
                              </div>
                            )}

                            {/* No results */}
                            {relayStatus === 'empty' && (
                              <div className="flex gap-2">
                                <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center">
                                  <Sparkles size={12} className="text-white" />
                                </div>
                                <div className="rounded-2xl rounded-tl-none bg-white/10 px-3 py-2 text-sm text-white/60">
                                  No matching moments found. Try different keywords.
                                </div>
                              </div>
                            )}

                            {/* Match results */}
                            {relayStatus === 'found' && relayMatches.map((m, i) => (
                              <div key={i} className="flex gap-2">
                                <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center">
                                  <Sparkles size={12} className="text-white" />
                                </div>
                                <button
                                  className="rounded-2xl rounded-tl-none bg-indigo-500/20 border border-indigo-500/30 px-3 py-2 text-left text-sm text-indigo-100 hover:bg-indigo-500/30 transition-colors w-full"
                                  onClick={() => {
                                    // TODO: seek video to m.timestamp_sec when real player is integrated
                                    setShowRelayQuery(false);
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-indigo-200">{m.formatted_time}</span>
                                    <span className="text-xs text-indigo-300/60">{Math.round(m.confidence * 100)}% match</span>
                                  </div>
                                  <p className="text-white/70 text-xs line-clamp-2">{m.transcript_chunk}</p>
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="relative mt-auto">
                            <input
                              type="text"
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder="e.g., Does this support titanium?"
                              disabled={relayStatus === 'searching'}
                              className="w-full rounded-xl bg-white/10 pl-4 pr-10 py-3 text-sm text-white placeholder-white/40 outline-none focus:bg-white/20 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && query.trim() && relayStatus !== 'searching') {
                                  setRelayStatus('searching');
                                  setRelayMatches([]);
                                  try {
                                    const res = await searchRelay(channel.id, query.trim());
                                    if (res.matches.length > 0) {
                                      setRelayMatches(res.matches);
                                      setRelayStatus('found');
                                    } else {
                                      setRelayStatus('empty');
                                    }
                                  } catch {
                                    setRelayStatus('empty');
                                  }
                                  setQuery('');
                                }
                              }}
                            />
                            <button 
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                              disabled={relayStatus === 'searching' || !query.trim()}
                              onClick={async () => {
                                if (query.trim() && relayStatus !== 'searching') {
                                  setRelayStatus('searching');
                                  setRelayMatches([]);
                                  try {
                                    const res = await searchRelay(channel.id, query.trim());
                                    if (res.matches.length > 0) {
                                      setRelayMatches(res.matches);
                                      setRelayStatus('found');
                                    } else {
                                      setRelayStatus('empty');
                                    }
                                  } catch {
                                    setRelayStatus('empty');
                                  }
                                  setQuery('');
                                }
                              }}
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Channel Nav Arrows (appear on hover) */}
                <AnimatePresence>
                  {showControls && (
                    <>
                      {onPrevChannel && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={onPrevChannel}
                          className="absolute left-1/2 top-20 -translate-x-1/2 z-30 rounded-full bg-black/40 p-2 backdrop-blur-md text-white/80 hover:bg-black/60 hover:text-white transition-colors pointer-events-auto"
                        >
                          <ChevronUp size={28} />
                        </motion.button>
                      )}
                      {onNextChannel && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={onNextChannel}
                          className="absolute left-1/2 bottom-36 -translate-x-1/2 z-30 rounded-full bg-black/40 p-2 backdrop-blur-md text-white/80 hover:bg-black/60 hover:text-white transition-colors pointer-events-auto"
                        >
                          <ChevronDown size={28} />
                        </motion.button>
                      )}
                    </>
                  )}
                </AnimatePresence>

                {/* Volume Control (appears on hover) */}
                <AnimatePresence>
                  {showControls && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-36 left-4 z-30 flex flex-col items-center gap-2 pointer-events-auto"
                    >
                      <div className="relative h-24 w-8 flex items-center justify-center">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setVolume(v);
                            if (v > 0) setIsMuted(false);
                            hlsPlayerRef.current?.setVolume(v / 100);
                            hlsPlayerRef.current?.setMuted(v === 0);
                          }}
                          className="absolute h-20 w-1.5 appearance-none rounded-full bg-white/20 outline-none [writing-mode:vertical-lr] direction-rtl [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setIsMuted(m => {
                            const newMuted = !m;
                            hlsPlayerRef.current?.setMuted(newMuted);
                            if (!newMuted) setShowUnmuteHint(false);
                            return newMuted;
                          });
                        }}
                        className="rounded-full bg-black/40 p-2 backdrop-blur-md text-white/80 hover:bg-black/60 hover:text-white transition-colors"
                      >
                        {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <button
                        onClick={() => setIsCinematic(c => !c)}
                        className="rounded-full bg-black/40 p-2 backdrop-blur-md text-white/80 hover:bg-black/60 hover:text-white transition-colors"
                        title={isCinematic ? 'Exit cinematic' : 'Cinematic mode'}
                      >
                        {isCinematic ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Right Actions */}
                <div className="absolute bottom-32 right-4 flex flex-col gap-6 pointer-events-auto">
                  {/* Floating Hearts Container */}
                  {!isVOD && (
                  <div className="absolute bottom-full right-0 mb-4 w-12 h-64 pointer-events-none z-50 flex justify-center">
                    <AnimatePresence>
                      {hearts.map((heart) => (
                        <motion.div
                          key={heart.id}
                          initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                          animate={{ 
                            opacity: 0, 
                            y: -200, 
                            x: heart.x, 
                            scale: 1.5 
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="absolute bottom-0 text-red-500 drop-shadow-md"
                        >
                          <Heart size={28} fill="currentColor" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  )}

                  {!isVOD && (
                  <button onClick={handleLike} className="flex flex-col items-center gap-1">
                    <motion.div 
                      whileTap={{ scale: 0.8 }}
                      className="rounded-full bg-black/40 p-3 backdrop-blur-md"
                    >
                      <Heart size={24} className="text-white" />
                    </motion.div>
                    <span className="text-xs font-medium">{formatCount(likeCount)}</span>
                  </button>
                  )}
                  {!isVOD && (
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="rounded-full bg-black/40 p-3 backdrop-blur-md">
                      <MessageCircle size={24} className="text-white" />
                    </div>
                    <span className="text-xs font-medium">{messages.length || ''}</span>
                  </button>
                  )}
                  <div className="relative">
                    <button onClick={() => setShowShareSheet(s => !s)} className="flex flex-col items-center gap-1">
                      <div className="rounded-full bg-black/40 p-3 backdrop-blur-md">
                        <Share2 size={24} className="text-white" />
                      </div>
                      <span className="text-xs font-medium">Share</span>
                    </button>
                    <AnimatePresence>
                      {showShareSheet && (
                        <ShareSheet
                          title={`Watch ${channel.title} on Greggie™`}
                          text={`Check out ${channel.merchant.name} live on Greggie™!`}
                          url={window.location.href}
                          onClose={() => setShowShareSheet(false)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Products Tray */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 pointer-events-auto">
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                    {channel.products.map((product) => (
                      <motion.div
                        key={product.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => onViewProduct?.(product)}
                        className="flex min-w-[280px] snap-center items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-xl border border-white/10 cursor-pointer"
                      >
                        <img src={product.mediaUrl} alt={product.name} className="h-16 w-16 rounded-xl object-cover pointer-events-none" />
                        <div className="flex-1">
                          <h3 className="font-semibold leading-tight line-clamp-1">{product.name}</h3>
                          {product.saleType === 'auction' ? (
                            <p className="text-sm font-bold text-red-400">Bid: ${product.currentBid?.toFixed(2)}</p>
                          ) : product.saleType === 'drop' ? (
                            <p className="text-sm font-bold text-indigo-400 flex items-center gap-1">
                              <Timer size={14} />
                              <Countdown endTime={product.endTime!} />
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-green-400">${product.price.toFixed(2)}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onBuy(product); }}
                          className={`flex h-10 px-4 items-center justify-center rounded-full text-sm font-bold transition-transform active:scale-95 ${
                            product.saleType === 'auction' ? 'bg-red-500 text-white' :
                            product.saleType === 'drop' ? 'bg-indigo-500 text-white' :
                            'bg-white text-black'
                          }`}
                        >
                          {product.saleType === 'auction' ? <Gavel size={18} /> :
                           product.saleType === 'drop' ? 'Drop' :
                           <ButterflyIcon size={18} />}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Chat Interface (hidden for VOD) */}
                {!isVOD && (
                <AnimatePresence>
                  {isChatOpen && (
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="absolute bottom-0 left-0 right-0 z-50 flex h-[60vh] flex-col rounded-t-3xl bg-black/80 backdrop-blur-2xl border-t border-white/10 pointer-events-auto"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 p-4">
                        <h3 className="font-bold text-white">Live Chat</h3>
                        <button onClick={() => setIsChatOpen(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      
                      {/* Pinned Question */}
                      <AnimatePresence>
                        {pinnedQuestion && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-indigo-600/20 border-b border-indigo-500/30 p-3 flex items-start gap-3"
                          >
                            <div className="rounded-full bg-indigo-500 p-1.5 mt-0.5">
                              <HelpCircle size={14} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-indigo-300">{pinnedQuestion.user} asks:</p>
                              <p className="text-sm text-white font-medium">{pinnedQuestion.text}</p>
                            </div>
                            <button 
                              onClick={() => setPinnedQuestion(null)}
                              className="text-white/50 hover:text-white"
                            >
                              <X size={16} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {messages.map((msg: LiveMessage) => (
                          <div key={msg.id} className="flex flex-col">
                            {msg.isSystem ? (
                              <span className="text-sm font-medium text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg inline-block w-fit">
                                {msg.text}
                              </span>
                            ) : msg.isQuestion ? (
                              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                                  <HelpCircle size={12} /> {msg.user}
                                </span>
                                <span className="text-sm text-white block mt-1">{msg.text}</span>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs font-bold text-white/50">{msg.user}</span>
                                <span className="text-sm text-white">{msg.text}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Gift Menu */}
                      <AnimatePresence>
                        {showGiftMenu && (
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="absolute bottom-full left-4 right-4 mb-2 rounded-2xl bg-gray-900 border border-white/10 p-4 shadow-2xl"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-bold text-white">Send a Gift</h4>
                              <span className="text-xs font-medium text-indigo-400">Balance: $142.50</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {GIFTS.map(gift => (
                                <button
                                  key={gift.id}
                                  onClick={() => handleSendGift(gift)}
                                  className="flex flex-col items-center gap-1 rounded-xl bg-white/5 p-2 hover:bg-white/10 transition-colors"
                                >
                                  <span className="text-2xl">{gift.icon}</span>
                                  <span className="text-xs text-white/70">{gift.name}</span>
                                  <span className="text-xs font-bold text-white">${gift.price}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="border-t border-white/10 p-4 pb-8 relative">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!chatMessage.trim()) return;

                            sendChat(channel.id, chatMessage, displayName);

                            if (isAskMode) {
                              setPinnedQuestion({ user: displayName, text: chatMessage });
                              setIsAskMode(false);
                            }
                            
                            setChatMessage('');
                          }}
                          className="flex gap-2 items-center"
                        >
                          <button
                            type="button"
                            onClick={() => setShowGiftMenu(!showGiftMenu)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-colors"
                          >
                            <Gift size={20} />
                          </button>
                          
                          <div className="flex-1 relative flex items-center">
                            <input
                              type="text"
                              value={chatMessage}
                              onChange={(e) => setChatMessage(e.target.value)}
                              placeholder={isAskMode ? "Ask a question..." : "Say something..."}
                              className={`w-full rounded-full px-4 py-2 pr-10 text-sm text-white placeholder-white/50 outline-none transition-colors ${
                                isAskMode ? 'bg-indigo-600/30 border border-indigo-500/50' : 'bg-white/10 focus:bg-white/20'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setIsAskMode(!isAskMode)}
                              className={`absolute right-2 p-1.5 rounded-full transition-colors ${
                                isAskMode ? 'text-indigo-400 bg-indigo-500/20' : 'text-white/40 hover:text-white/80'
                              }`}
                            >
                              <HelpCircle size={16} />
                            </button>
                          </div>

                          <button 
                            type="submit"
                            disabled={!chatMessage.trim()}
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                              isAskMode ? 'bg-indigo-600' : 'bg-white/20'
                            }`}
                          >
                            <Send size={16} />
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                )}
              </>
            )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
