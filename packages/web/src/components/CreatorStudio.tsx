import { motion, AnimatePresence } from 'motion/react';
import type { Channel, Product } from '../data/mockData';
import {
  Users, DollarSign, Heart, Package, X, Mic, Video, MessageCircle,
  Gavel, Timer, HelpCircle, Plus, Settings, BarChart3, Zap, Trash2,
  Edit3, Pin, PinOff, TrendingUp, Eye, ArrowLeft,
  Clock, Tag, Image, ChevronDown, Send, Flame, Gift, Radio, Copy, Check,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api';
import { ButterflyIcon } from './ButterflyIcon';
import { HlsPlayer, type HlsPlayerHandle } from './HlsPlayer';

type Tab = 'products' | 'chat' | 'analytics' | 'tools' | 'revenue' | 'orders';

type CreatorStudioProps = {
  onExit: () => void;
};

function getProgramStatusLabel(status?: api.SellerProgram['status']) {
  switch (status) {
    case 'pending':
      return 'Under review';
    case 'approved':
      return 'Approved';
    case 'active':
      return 'Active';
    case 'suspended':
      return 'Suspended';
    case 'rejected':
      return 'Needs attention';
    case 'closed':
      return 'Closed';
    default:
      return 'Not enrolled';
  }
}

function getProgramStatusTone(status?: api.SellerProgram['status']) {
  switch (status) {
    case 'active':
      return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
    case 'approved':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'pending':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'suspended':
    case 'rejected':
    case 'closed':
      return 'bg-red-500/15 text-red-300 border border-red-500/30';
    default:
      return 'bg-gray-700 text-gray-300 border border-gray-600';
  }
}

/* ── Add Product Modal ───────────────────────────────── */
function AddProductModal({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: (data: { name: string; description: string; image_url: string; price_cents: number; inventory: number; sale_type: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [inventory, setInventory] = useState('10');
  const [saleType, setSaleType] = useState('buy_now');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 p-6 mx-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Add Product</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-800 text-gray-400"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Product Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vintage Sneakers"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Describe your product..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Product Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative mb-2">
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-gray-700" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                ><X size={14} /></button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:text-indigo-400 transition-colors mb-2"
              >
                <span className="text-2xl mb-1">📷</span>
                <span className="text-xs">Click to upload image</span>
              </button>
            )}
            <input value={imagePreview ? '' : imageUrl} onChange={e => { setImageUrl(e.target.value); setImagePreview(null); }} placeholder="Or paste image URL..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Price ($)</label>
              <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="29.99"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Inventory</label>
              <input type="number" min="0" value={inventory} onChange={e => setInventory(e.target.value)} placeholder="10"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Sale Type</label>
            <div className="flex gap-2">
              {(['buy_now', 'auction', 'drop'] as const).map(t => (
                <button key={t} onClick={() => setSaleType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    saleType === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  }`}>
                  {t === 'buy_now' ? 'Buy Now' : t === 'auction' ? 'Auction' : 'Drop'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors">Cancel</button>
          <button
            disabled={!name || !price || saving}
            onClick={() => onSave({ name, description, image_url: imageUrl, price_cents: Math.round(parseFloat(price) * 100), inventory: parseInt(inventory) || 0, sale_type: saleType })}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Channel Settings Modal ──────────────────────────── */
function ChannelSettingsModal({
  channel,
  onClose,
  onSave,
  onDelete,
}: {
  channel: Channel;
  onClose: () => void;
  onSave: (data: { title: string; description: string; category: string; sale_type: string }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(channel.title);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(channel.category);
  const [saleType, setSaleType] = useState('buy_now');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categories = ['Fashion', 'Electronics', 'Collectibles', 'Beauty', 'Food & Drink', 'Art & Design', 'Fitness', 'Home & Living', 'Luxury', 'Gaming'];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 p-6 mx-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Channel Settings</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-800 text-gray-400"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Channel Name</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    category === c ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  }`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Default Sale Type</label>
            <div className="flex gap-2">
              {(['buy_now', 'auction', 'drop'] as const).map(t => (
                <button key={t} onClick={() => setSaleType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    saleType === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  }`}>
                  {t === 'buy_now' ? 'Buy Now' : t === 'auction' ? 'Auction' : 'Drop'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={() => onSave({ title, description, category, sale_type: saleType })}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">Save</button>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-800">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-xl text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">
              Delete Channel
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-400 text-center">This will permanently delete your channel, products, and all data.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors">Nevermind</button>
                <button onClick={onDelete} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors">Yes, Delete</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── CSP Enrollment Modal ──────────────────────────────── */
function CSPEnrollmentModal({
  onClose,
  onEnroll,
  enrolling,
}: {
  onClose: () => void;
  onEnroll: (note: string) => void;
  enrolling: boolean;
}) {
  const [agreed, setAgreed] = useState(false);
  const [note, setNote] = useState('');

  const tiers = [
    { name: 'New', pct: '20%', desc: 'Starting tier for all creators' },
    { name: 'Rising', pct: '15%', desc: '50+ orders, $5K+ revenue' },
    { name: 'Established', pct: '12%', desc: '200+ orders, $25K+ revenue' },
    { name: 'Partner', pct: '10%', desc: 'Invite-only, top creators' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 p-6 mx-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Creator-Seller Program</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-800 text-gray-400"><X size={18} /></button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Join the Greggie Creator-Seller Program (CSP) to monetize your live streams. Sell products during broadcasts, earn revenue, and grow through our tiered commission system.
        </p>

        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Commission Tiers</h4>
          <div className="space-y-2">
            {tiers.map(t => (
              <div key={t.name} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-sm font-bold text-white">{t.name}</span>
                  <span className="text-[11px] text-gray-500 ml-2">{t.desc}</span>
                </div>
                <span className="text-sm font-bold text-indigo-400">{t.pct}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5">Tell us about yourself (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What do you plan to sell? What's your content niche?"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer group">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0" />
          <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
            I agree to the Greggie Creator-Seller Program terms, including the commission structure and payout policies.
          </span>
        </label>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors">Cancel</button>
          <button
            disabled={!agreed || enrolling}
            onClick={() => onEnroll(note)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enrolling ? 'Enrolling...' : 'Join CSP'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Creator Studio ─────────────────────────────── */
export function CreatorStudio({ onExit }: CreatorStudioProps) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [likes, setLikes] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [pinnedProduct, setPinnedProduct] = useState<Product | null>(null);
  const [pinnedQuestion, setPinnedQuestion] = useState<{user: string; text: string} | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [streamTimer, setStreamTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // CSP state
  const [cspStatus, setCspStatus] = useState<api.SellerProgram | null>(null);
  const [cspDashboard, setCspDashboard] = useState<api.SellerDashboard | null>(null);
  const [cspOrders, setCspOrders] = useState<api.SellerOrderView[]>([]);
  const [cspPayouts, setCspPayouts] = useState<api.SellerPayout[]>([]);
  const [showCSPEnroll, setShowCSPEnroll] = useState(false);
  const [enrollingCSP, setEnrollingCSP] = useState(false);

  // Stream credentials state
  const [streamCredentials, setStreamCredentials] = useState<{ rtmp_url: string; stream_key: string; hls_url: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Engagement tools state
  const [flashSaleActive, setFlashSaleActive] = useState(false);
  const [flashSaleTimer, setFlashSaleTimer] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(0);

  const [chatMessages, setChatMessages] = useState([
    { id: '1', user: 'Alex', text: 'This looks amazing!', isQuestion: false, ts: '2s ago' },
    { id: '2', user: 'Sam', text: 'Is there a warranty?', isQuestion: true, ts: '5s ago' },
    { id: '3', user: 'Jordan', text: 'Just bought one 🚀', isQuestion: false, ts: '12s ago' },
    { id: '4', user: 'Taylor', text: 'Does it come in black?', isQuestion: true, ts: '18s ago' },
    { id: '5', user: 'Morgan', text: 'The quality looks incredible', isQuestion: false, ts: '25s ago' },
    { id: '6', user: 'Casey', text: 'What sizes are available?', isQuestion: true, ts: '30s ago' },
  ]);

  const ensureAuth = async () => {
    if (api.getToken()) return;
    await api.devLogin();
  };

  const loadData = useCallback(async () => {
    try {
      await ensureAuth();
      const channels = await api.getCreatorChannels();
      if (channels.length > 0) {
        const ch = channels[0];
        setChannel(ch);
        setProducts(ch.products);
        setIsLive(ch.type === 'LIVE');
        setViewers(ch.viewers);
      }
      // Load CSP status
      try {
        const status = await api.getProgramStatus('csp');
        setCspStatus(status.program);
      } catch {
        // Not enrolled yet — that's fine
      }
    } catch {
      // No channels yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll analytics while live
  useEffect(() => {
    if (!isLive || !channel) return;
    const interval = setInterval(async () => {
      try {
        const a = await api.getChannelAnalytics(channel.id);
        setViewers(Number(a.total_viewers));
        setRevenue(a.total_revenue_cents);
        setLikes(a.total_likes);
        setTotalOrders(a.total_orders);
        setConversionRate(a.conversion_rate);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, channel]);

  // Stream timer
  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(() => setStreamTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setStreamTimer(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLive]);

  // Flash sale countdown
  useEffect(() => {
    if (!flashSaleActive) return;
    const i = setInterval(() => {
      setFlashSaleTimer(t => {
        if (t <= 1) { setFlashSaleActive(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [flashSaleActive]);

  // Countdown timer
  useEffect(() => {
    if (!countdownActive) return;
    const i = setInterval(() => {
      setCountdownTimer(t => {
        if (t <= 1) { setCountdownActive(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [countdownActive]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleToggleLive = async () => {
    if (!channel) return;
    try {
      if (isLive) {
        await api.endStream(channel.id);
        setIsLive(false);
        setFlashSaleActive(false);
        setCountdownActive(false);
        setStreamCredentials(null);
      } else {
        const res = await api.goLive(channel.id);
        setIsLive(true);
        setStreamCredentials({ rtmp_url: res.rtmp_url, stream_key: res.stream_key, hls_url: res.hls_url });
      }
    } catch { /* ignore */ }
  };

  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePinProduct = async (product: Product) => {
    if (!channel) return;
    try {
      await api.pinProduct(channel.id, product.id);
      setPinnedProduct(product);
    } catch { /* ignore */ }
  };

  const handleUnpinProduct = async () => {
    if (!channel) return;
    try {
      await api.unpinProduct(channel.id);
      setPinnedProduct(null);
    } catch { /* ignore */ }
  };

  const handleAddProduct = async (data: { name: string; description: string; image_url: string; price_cents: number; inventory: number; sale_type: string }) => {
    if (!channel) return;
    setSavingProduct(true);
    try {
      const p = await api.createProduct(channel.id, data);
      setProducts(prev => [...prev, p]);
      setShowAddProduct(false);
    } catch { /* ignore */ }
    setSavingProduct(false);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!channel) return;
    try {
      await api.deleteProduct(channel.id, productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      if (pinnedProduct?.id === productId) setPinnedProduct(null);
    } catch { /* ignore */ }
  };

  const handleUpdateChannel = async (data: { title: string; description: string; category: string; sale_type: string }) => {
    if (!channel) return;
    try {
      const updated = await api.updateChannel(channel.id, data);
      setChannel(updated);
      setShowSettings(false);
    } catch { /* ignore */ }
  };

  const handleDeleteChannel = async () => {
    if (!channel) return;
    try {
      await api.deleteChannel(channel.id);
      setChannel(null);
      setProducts([]);
      setShowSettings(false);
    } catch { /* ignore */ }
  };

  const handleCreateChannel = async () => {
    setCreating(true);
    setError(null);
    try {
      await ensureAuth();
      const ch = await api.createChannel({ title: 'My Live Store', category: 'Fashion', sale_type: 'buy_now' });
      setChannel(ch);
      setProducts(ch.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create channel');
    } finally {
      setCreating(false);
    }
  };

  const startFlashSale = () => {
    setFlashSaleTimer(300); // 5 min
    setFlashSaleActive(true);
  };

  const startCountdown = () => {
    setCountdownTimer(60);
    setCountdownActive(true);
  };

  const handleCSPEnroll = async (note: string) => {
    setEnrollingCSP(true);
    try {
      const program = await api.enrollProgram('csp', note);
      setCspStatus(program);
      setShowCSPEnroll(false);
    } catch { /* ignore */ }
    setEnrollingCSP(false);
  };

  const loadCSPDashboard = useCallback(async () => {
    if (!cspStatus || cspStatus.status !== 'active') return;
    try {
      const d = await api.getCSPDashboard();
      setCspDashboard(d);
    } catch { /* ignore */ }
  }, [cspStatus]);

  const loadCSPOrders = useCallback(async () => {
    if (!cspStatus || cspStatus.status !== 'active') return;
    try {
      const o = await api.getSellerOrders('csp');
      setCspOrders(o);
    } catch { /* ignore */ }
  }, [cspStatus]);

  const loadCSPPayouts = useCallback(async () => {
    if (!cspStatus || cspStatus.status !== 'active') return;
    try {
      const p = await api.getSellerPayouts('csp');
      setCspPayouts(p);
    } catch { /* ignore */ }
  }, [cspStatus]);

  // Load CSP data when switching to relevant tabs
  useEffect(() => {
    if (activeTab === 'revenue') { loadCSPDashboard(); loadCSPPayouts(); }
    if (activeTab === 'orders') loadCSPOrders();
  }, [activeTab, loadCSPDashboard, loadCSPOrders, loadCSPPayouts]);

  const cspActive = cspStatus?.status === 'active';

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="h-full w-full bg-[#0A0A0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <ButterflyIcon size={48} />
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  /* ── No channel — Onboarding ── */
  if (!channel) {
    return (
      <div className="h-full w-full bg-[#0A0A0F] text-white flex flex-col items-center justify-center gap-6 p-8">
        <ButterflyIcon size={64} />
        <h2 className="text-2xl font-bold">Creator Studio</h2>
        <p className="text-white/50 text-center max-w-sm">Create your first channel to start selling live.</p>
        {error && <p className="text-red-400 text-sm text-center max-w-sm">{error}</p>}
        <button onClick={handleCreateChannel} disabled={creating}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50">
          {creating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Plus size={20} />}
          {creating ? 'Creating...' : 'Create Channel'}
        </button>
        <button onClick={onExit} className="text-white/40 text-sm hover:text-white/60 transition-colors">Back</button>
      </div>
    );
  }

  /* ── Tabs for right panel ── */
  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'tools', label: 'Tools', icon: Zap },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'orders', label: 'Orders', icon: Tag },
  ];

  /* ── Main Dashboard Layout ── */
  return (
    <div className="h-full w-full bg-[#0A0A0F] text-white flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-800/60 bg-[#0D0D14]">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="p-2.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <ButterflyIcon size={24} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold truncate max-w-[200px]">{channel.title}</h1>
              {isLive && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-xs font-bold uppercase tracking-wider animate-pulse">
                  <Radio size={10} /> Live
                </span>
              )}
              {cspStatus && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getProgramStatusTone(cspStatus.status)}`}>
                  {cspActive ? cspStatus.tier : getProgramStatusLabel(cspStatus.status)}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500">{channel.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="text-xs font-mono text-gray-400 bg-gray-800/60 px-2.5 py-1 rounded-lg">
              <Clock size={12} className="inline mr-1 -mt-0.5" />{formatTime(streamTimer)}
            </span>
          )}
          <button onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ── CSP Enrollment Banner ── */}
      {!cspStatus && (
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-2 bg-indigo-600/10 border-b border-indigo-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-400" />
            <span className="text-xs text-indigo-300">Join the <span className="font-bold">Creator-Seller Program</span> to earn revenue from your streams</span>
          </div>
          <button onClick={() => setShowCSPEnroll(true)}
            className="px-3 py-1 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 transition-colors">
            Join CSP
          </button>
        </div>
      )}

      {cspStatus && cspStatus.status !== 'active' && (
        <div className={`flex-shrink-0 flex items-center justify-between px-5 py-2 border-b ${cspStatus.status === 'pending' || cspStatus.status === 'approved' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className={cspStatus.status === 'pending' || cspStatus.status === 'approved' ? 'text-amber-300' : 'text-red-300'} />
            <span className="text-xs text-white/80">
              {cspStatus.status === 'pending' && 'Your CSP application is under review. Revenue, payouts, and seller order actions unlock after activation.'}
              {cspStatus.status === 'approved' && 'Your CSP application is approved and awaiting activation. Revenue and order operations will unlock once the program is live.'}
              {cspStatus.status === 'suspended' && 'Your CSP access is suspended. Revenue and seller order actions are temporarily unavailable.'}
              {cspStatus.status === 'rejected' && 'Your CSP application needs attention before seller operations can be enabled.'}
              {cspStatus.status === 'closed' && 'Your CSP enrollment is closed. Re-enrollment is required before seller operations can resume.'}
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getProgramStatusTone(cspStatus.status)}`}>
            {getProgramStatusLabel(cspStatus.status)}
          </span>
        </div>
      )}

      {/* ── Body: Preview + Panel ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* ── Left: Stream Preview ── */}
        <div className="h-48 sm:h-64 lg:h-auto lg:w-[45%] flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800/60">
          {/* Preview */}
          <div className="relative flex-1 bg-black overflow-hidden">
            {isLive && streamCredentials ? (
              <HlsPlayer
                src={streamCredentials.hls_url}
                muted={false}
                className="absolute inset-0 h-full w-full object-cover"
                onStreamReady={() => {}}
                onStreamError={() => {}}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                <div className="text-center">
                  <Video size={48} className="mx-auto mb-3 text-gray-600" />
                  <p className="text-sm text-gray-500">Stream preview will appear here</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

            {/* Stream overlay badges */}
            {isLive && (
              <div className="absolute top-3 left-3 flex gap-2">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-3 py-1 text-xs font-medium">
                  <Eye size={12} className="text-indigo-400" /> {viewers.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-3 py-1 text-xs font-medium text-green-400">
                  <DollarSign size={12} /> ${(revenue / 100).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-3 py-1 text-xs font-medium text-pink-400">
                  <Heart size={12} /> {likes.toLocaleString()}
                </div>
              </div>
            )}

            {/* Active overlays on stream */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
              {/* Flash sale overlay */}
              {flashSaleActive && (
                <div className="bg-red-600/90 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2 border border-red-500/50">
                  <Flame size={16} className="text-yellow-300" />
                  <span className="text-xs font-bold uppercase tracking-wider flex-1">Flash Sale</span>
                  <span className="text-sm font-mono font-bold">{formatTime(flashSaleTimer)}</span>
                </div>
              )}
              {/* Countdown overlay */}
              {countdownActive && (
                <div className="bg-indigo-600/90 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2 border border-indigo-500/50">
                  <Timer size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider flex-1">Dropping in</span>
                  <span className="text-sm font-mono font-bold">{formatTime(countdownTimer)}</span>
                </div>
              )}
              {/* Pinned product overlay */}
              {pinnedProduct && (
                <div className="bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-3 border border-indigo-500/30">
                  {pinnedProduct.mediaUrl && <img src={pinnedProduct.mediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Pinned</p>
                    <p className="text-sm font-semibold truncate">{pinnedProduct.name}</p>
                  </div>
                  <p className="text-sm font-bold text-green-400">${pinnedProduct.price.toFixed(2)}</p>
                  <button onClick={handleUnpinProduct} className="p-1 rounded-full hover:bg-white/10"><X size={14} /></button>
                </div>
              )}
              {/* Pinned question overlay */}
              {pinnedQuestion && (
                <div className="bg-orange-600/80 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2 border border-orange-500/30">
                  <HelpCircle size={14} className="text-orange-200 flex-shrink-0" />
                  <p className="text-xs flex-1 min-w-0 truncate"><span className="font-bold text-orange-200">{pinnedQuestion.user}:</span> {pinnedQuestion.text}</p>
                  <button onClick={() => setPinnedQuestion(null)} className="p-1 rounded-full hover:bg-white/10"><X size={12} /></button>
                </div>
              )}
            </div>
          </div>

          {/* Stream controls */}
          <div className="flex-shrink-0 p-3 flex flex-col gap-2 bg-[#0D0D14] border-t border-gray-800/60">
            {/* Stream Credentials (shown when live) */}
            <AnimatePresence>
              {isLive && streamCredentials && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mb-2 space-y-1.5">
                    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-bold text-gray-500 uppercase w-16 flex-shrink-0">Server</span>
                      <code className="text-xs text-indigo-300 flex-1 truncate">{streamCredentials.rtmp_url}</code>
                      <button
                        onClick={() => handleCopyToClipboard(streamCredentials.rtmp_url, 'rtmp')}
                        className="p-1 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                      >
                        {copiedField === 'rtmp' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-bold text-gray-500 uppercase w-16 flex-shrink-0">Key</span>
                      <code className="text-xs text-indigo-300 flex-1 truncate font-mono">{streamCredentials.stream_key}</code>
                      <button
                        onClick={() => handleCopyToClipboard(streamCredentials.stream_key, 'key')}
                        className="p-1 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                      >
                        {copiedField === 'key' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 text-center">Paste these into OBS → Settings → Stream</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <button onClick={handleToggleLive}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  isLive
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                }`}>
                {isLive ? <><Radio size={16} /> End Stream</> : <><Video size={16} /> Go Live</>}
              </button>
              <button className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300">
                <Mic size={18} />
              </button>
              <button className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300">
                <Video size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Tab Panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex-shrink-0 flex overflow-x-auto scrollbar-hide border-b border-gray-800/60 bg-[#0D0D14]">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    isActive
                      ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5'
                      : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/30'
                  }`}>
                  <Icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === 'chat' && <span className="ml-1 w-2 h-2 rounded-full bg-red-500" />}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {/* ── Products Tab ── */}
            {activeTab === 'products' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-sm font-bold">Products ({products.length})</h2>
                    <p className="text-[11px] text-gray-500">Manage your product catalog</p>
                  </div>
                  <button onClick={() => setShowAddProduct(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold transition-colors">
                    <Plus size={14} /> Add
                  </button>
                </div>
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Package size={40} strokeWidth={1} className="mb-3 text-gray-600" />
                    <p className="text-sm font-medium">No products yet</p>
                    <p className="text-xs text-gray-600 mt-1">Add products to showcase during your stream</p>
                  </div>
                ) : (
                  products.map(product => (
                    <div key={product.id} className="flex gap-3 bg-gray-800/40 rounded-xl p-3 border border-gray-800 hover:border-gray-700 transition-colors group">
                      <div className="w-16 h-16 rounded-lg bg-gray-700 overflow-hidden flex-shrink-0">
                        {product.mediaUrl ? (
                          <img src={product.mediaUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Image size={20} className="text-gray-500" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-semibold truncate">{product.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-green-400">${product.price.toFixed(2)}</span>
                            <span className="text-xs text-gray-500">|</span>
                            <span className="text-xs text-gray-400">{product.inventory} in stock</span>
                            {product.saleType && product.saleType !== 'buy_now' && (
                              <>
                                <span className="text-xs text-gray-500">|</span>
                                <span className="text-xs uppercase font-bold text-indigo-400">{product.saleType === 'auction' ? 'Auction' : 'Drop'}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          {pinnedProduct?.id === product.id ? (
                            <button onClick={handleUnpinProduct}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white">
                              <PinOff size={10} /> Unpin
                            </button>
                          ) : (
                            <button onClick={() => handlePinProduct(product)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white transition-colors">
                              <Pin size={10} /> Pin to Stream
                            </button>
                          )}
                          <button onClick={() => handleDeleteProduct(product.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-700 text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={10} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Chat Tab ── */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold">Live Chat</h2>
                    <p className="text-[11px] text-gray-500">{chatMessages.length} messages</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-400">
                      {chatMessages.filter(m => m.isQuestion).length} Questions
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`rounded-xl p-3 border transition-colors group ${
                      msg.isQuestion ? 'bg-orange-500/5 border-orange-500/20' : 'bg-gray-800/30 border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-400">{msg.user}</span>
                        <span className="text-xs text-gray-600">{msg.ts}</span>
                        {msg.isQuestion && (
                          <span className="text-[11px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full ml-auto">Q</span>
                        )}
                      </div>
                      <p className="text-sm text-white/80">{msg.text}</p>
                      <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setPinnedQuestion({ user: msg.user, text: msg.text }); }}
                          className="px-2 py-1 rounded-md text-xs font-bold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 transition-colors">
                          Pin to Stream
                        </button>
                        <button onClick={() => setChatMessages(prev => prev.filter(m => m.id !== msg.id))}
                          className="px-2 py-1 rounded-md text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Analytics Tab ── */}
            {activeTab === 'analytics' && (
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="text-sm font-bold mb-1">Stream Analytics</h2>
                  <p className="text-[11px] text-gray-500">{isLive ? 'Real-time metrics' : 'Go live to see real-time stats'}</p>
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/20"><Eye size={14} className="text-indigo-400" /></div>
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Viewers</span>
                    </div>
                    <p className="text-2xl font-bold">{viewers.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-green-500/20"><DollarSign size={14} className="text-green-400" /></div>
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">${(revenue / 100).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-pink-500/20"><Heart size={14} className="text-pink-400" /></div>
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Likes</span>
                    </div>
                    <p className="text-2xl font-bold text-pink-400">{likes.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-yellow-500/20"><ButterflyIcon size={14} /></div>
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Orders</span>
                    </div>
                    <p className="text-2xl font-bold">{totalOrders.toLocaleString()}</p>
                  </div>
                </div>

                {/* Conversion & Duration */}
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Performance</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-indigo-400">{conversionRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Conversion</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{formatTime(streamTimer)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Duration</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-400">${viewers > 0 ? ((revenue / 100) / viewers).toFixed(2) : '0.00'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Revenue/Viewer</p>
                    </div>
                  </div>
                </div>

                {/* Product performance */}
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Product Catalog</h3>
                  {products.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Add products to see performance</p>
                  ) : (
                    <div className="space-y-2">
                      {products.map(p => (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-gray-700 overflow-hidden flex-shrink-0">
                            {p.mediaUrl && <img src={p.mediaUrl} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                          <span className="text-xs text-green-400 font-bold">${p.price.toFixed(2)}</span>
                          <span className="text-xs text-gray-500">{p.inventory} left</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tools Tab ── */}
            {activeTab === 'tools' && (
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="text-sm font-bold mb-1">Engagement Tools</h2>
                  <p className="text-[11px] text-gray-500">Boost interaction and drive sales</p>
                </div>

                {/* Flash Sale */}
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-red-500/20"><Flame size={18} className="text-red-400" /></div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">Flash Sale</h3>
                      <p className="text-[11px] text-gray-500">5-minute limited-time discount</p>
                    </div>
                    {flashSaleActive && <span className="text-sm font-mono font-bold text-red-400">{formatTime(flashSaleTimer)}</span>}
                  </div>
                  {flashSaleActive ? (
                    <button onClick={() => setFlashSaleActive(false)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors">
                      End Flash Sale
                    </button>
                  ) : (
                    <button onClick={startFlashSale} disabled={!isLive}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      Start Flash Sale
                    </button>
                  )}
                </div>

                {/* Countdown Drop */}
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-indigo-500/20"><Timer size={18} className="text-indigo-400" /></div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">Countdown Drop</h3>
                      <p className="text-[11px] text-gray-500">Build hype with a countdown timer</p>
                    </div>
                    {countdownActive && <span className="text-sm font-mono font-bold text-indigo-400">{formatTime(countdownTimer)}</span>}
                  </div>
                  {countdownActive ? (
                    <button onClick={() => setCountdownActive(false)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors">
                      Cancel Countdown
                    </button>
                  ) : (
                    <button onClick={startCountdown} disabled={!isLive}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      Start 60s Countdown
                    </button>
                  )}
                </div>

                {/* Auction */}
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20"><Gavel size={18} className="text-yellow-400" /></div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">Live Auction</h3>
                      <p className="text-[11px] text-gray-500">Start a bidding war on the pinned product</p>
                    </div>
                  </div>
                  <button disabled={!isLive || !pinnedProduct}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-yellow-600 text-white hover:bg-yellow-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {pinnedProduct ? `Auction: ${pinnedProduct.name}` : 'Pin a product first'}
                  </button>
                </div>

                {/* Giveaway */}
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-green-500/20"><Gift size={18} className="text-green-400" /></div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">Giveaway</h3>
                      <p className="text-[11px] text-gray-500">Pick a random viewer to win</p>
                    </div>
                  </div>
                  <button disabled={!isLive}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    Start Giveaway
                  </button>
                </div>

                {/* Quick actions */}
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button disabled={!isLive}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-700/50 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-30">
                      <Send size={14} /> Send Announcement
                    </button>
                    <button disabled={!isLive}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-700/50 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-30">
                      <Tag size={14} /> Discount Code
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Revenue Tab (CSP) ── */}
            {activeTab === 'revenue' && (
              <div className="p-4 space-y-4">
                {!cspStatus ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <DollarSign size={40} strokeWidth={1} className="mb-3 text-gray-600" />
                    <p className="text-sm font-medium mb-2">Join the Creator-Seller Program</p>
                    <p className="text-xs text-gray-600 mb-4 text-center max-w-xs">Enroll in CSP to track your revenue, payouts, and commission tier</p>
                    <button onClick={() => setShowCSPEnroll(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 transition-colors">
                      Join CSP
                    </button>
                  </div>
                ) : !cspActive ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <DollarSign size={40} strokeWidth={1} className="mb-3 text-gray-600" />
                    <p className="text-sm font-medium mb-2">CSP revenue tools unlock after activation</p>
                    <p className="text-xs text-gray-600 mb-4 text-center max-w-xs">
                      {cspStatus.status === 'pending' && 'Your application is in review. We will unlock payouts, commissions, and revenue tracking once CSP is active.'}
                      {cspStatus.status === 'approved' && 'Your application is approved and queued for activation. Revenue reporting will appear as soon as the program goes live.'}
                      {cspStatus.status !== 'pending' && cspStatus.status !== 'approved' && 'This CSP enrollment is not active right now, so revenue controls are temporarily unavailable.'}
                    </p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getProgramStatusTone(cspStatus.status)}`}>
                      {getProgramStatusLabel(cspStatus.status)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-sm font-bold mb-1">Revenue Overview</h2>
                      <p className="text-[11px] text-gray-500">Your Creator-Seller Program earnings</p>
                    </div>

                    {/* Tier progress */}
                    <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl p-4 border border-indigo-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Current Tier</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-xs font-bold text-indigo-300 uppercase">{cspDashboard?.current_tier || cspStatus.tier}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {['new', 'rising', 'established', 'partner'].map((tier, i) => (
                          <div key={tier} className="flex items-center gap-1 flex-1">
                            <div className={`h-1.5 rounded-full flex-1 ${
                              (cspDashboard?.current_tier || cspStatus.tier) === tier || ['new','rising','established','partner'].indexOf(cspDashboard?.current_tier || cspStatus.tier) >= i
                                ? 'bg-indigo-500' : 'bg-gray-700'
                            }`} />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        {['New', 'Rising', 'Est.', 'Partner'].map(t => (
                          <span key={t} className="text-[11px] text-gray-500">{t}</span>
                        ))}
                      </div>
                    </div>

                    {/* Revenue metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-green-500/20"><DollarSign size={14} className="text-green-400" /></div>
                          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">${((cspDashboard?.total_revenue_cents || 0) / 100).toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-indigo-500/20"><TrendingUp size={14} className="text-indigo-400" /></div>
                          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Commission</span>
                        </div>
                        <p className="text-2xl font-bold text-indigo-400">{cspDashboard?.commission_pct || 20}%</p>
                      </div>
                      <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-yellow-500/20"><Clock size={14} className="text-yellow-400" /></div>
                          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-400">${((cspDashboard?.pending_payouts_cents || 0) / 100).toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-green-500/20"><Check size={14} className="text-green-400" /></div>
                          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Paid Out</span>
                        </div>
                        <p className="text-2xl font-bold">${((cspDashboard?.paid_payouts_cents || 0) / 100).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Recent payouts */}
                    <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Payout History</h3>
                      {cspPayouts.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No payouts yet — revenue will appear after your first sale</p>
                      ) : (
                        <div className="space-y-2">
                          {cspPayouts.slice(0, 10).map(p => (
                            <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                              <div>
                                <span className="text-xs text-white font-medium">${(p.net_cents / 100).toFixed(2)}</span>
                                <span className="text-xs text-gray-500 ml-2">gross ${(p.gross_cents / 100).toFixed(2)} - ${(p.commission_cents / 100).toFixed(2)} fee</span>
                              </div>
                              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                                p.payout_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                p.payout_status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-700 text-gray-400'
                              }`}>{p.payout_status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Orders Tab (CSP) ── */}
            {activeTab === 'orders' && (
              <div className="p-4 space-y-3">
                {!cspStatus ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Package size={40} strokeWidth={1} className="mb-3 text-gray-600" />
                    <p className="text-sm font-medium">Enroll in CSP to manage orders</p>
                  </div>
                ) : !cspActive ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Package size={40} strokeWidth={1} className="mb-3 text-gray-600" />
                    <p className="text-sm font-medium">Seller order actions unlock after CSP activation</p>
                    <p className="text-xs text-gray-600 mt-1 text-center max-w-xs">You can keep building your channel now. Fulfillment actions appear once the CSP review lifecycle reaches active.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h2 className="text-sm font-bold">Stream Orders ({cspOrders.length})</h2>
                        <p className="text-[11px] text-gray-500">Orders from your live streams</p>
                      </div>
                    </div>
                    {cspOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <Package size={40} strokeWidth={1} className="mb-3 text-gray-600" />
                        <p className="text-sm font-medium">No orders yet</p>
                        <p className="text-xs text-gray-600 mt-1">Orders from your live streams will appear here</p>
                      </div>
                    ) : (
                      cspOrders.map(order => (
                        <div key={order.id} className="bg-gray-800/40 rounded-xl p-4 border border-gray-800">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8)}</span>
                              <span className="text-xs text-gray-500 ml-2">{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                              order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                              order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                              order.status === 'confirmed' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-700 text-gray-400'
                            }`}>{order.status}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                            <span className="text-sm font-bold text-green-400">${(order.total_cents / 100).toFixed(2)}</span>
                          </div>
                          {order.buyer_email && (
                            <p className="text-xs text-gray-500 mt-1">{order.buyer_email}</p>
                          )}
                          {/* Fulfillment actions */}
                          {(order.status === 'pending' || order.status === 'confirmed') && (
                            <div className="flex gap-2 mt-3">
                              {order.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    await api.updateOrderFulfillment(order.id, { status: 'processing' });
                                    loadCSPOrders();
                                  }}
                                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                                >
                                  Confirm Order
                                </button>
                              )}
                              {order.status === 'confirmed' && (
                                <button
                                  onClick={async () => {
                                    await api.updateOrderFulfillment(order.id, { status: 'shipped' });
                                    loadCSPOrders();
                                  }}
                                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                                >
                                  Mark Shipped
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddProduct && (
          <AddProductModal onClose={() => setShowAddProduct(false)} onSave={handleAddProduct} saving={savingProduct} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && (
          <ChannelSettingsModal channel={channel} onClose={() => setShowSettings(false)} onSave={handleUpdateChannel} onDelete={handleDeleteChannel} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCSPEnroll && (
          <CSPEnrollmentModal onClose={() => setShowCSPEnroll(false)} onEnroll={handleCSPEnroll} enrolling={enrollingCSP} />
        )}
      </AnimatePresence>
    </div>
  );
}
