import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Product } from '../data/mockData';
import * as api from '../services/api';
import {
  ArrowLeft, BarChart3, CheckCircle2, DollarSign, Package, Plus, Settings, Store,
  Truck, TrendingUp, X, ShieldCheck, Tag, Archive, Save,
} from 'lucide-react';
import { ButterflyIcon } from './ButterflyIcon';

type Tab = 'dashboard' | 'products' | 'orders' | 'analytics' | 'settings';

type Props = {
  onExit: () => void;
};

type ShopForm = {
  name: string;
  slug: string;
  description: string;
  shipping_from: string;
};

type ProductForm = {
  name: string;
  description: string;
  image_url: string;
  price_cents: number;
  inventory: number;
  condition: string;
  brand: string;
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
      return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30';
    case 'approved':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'pending':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    case 'suspended':
    case 'rejected':
    case 'closed':
      return 'bg-red-500/15 text-red-300 border border-red-500/30';
    default:
      return 'bg-white/5 text-white/60 border border-white/10';
  }
}

function ShopModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (data: ShopForm) => void; saving: boolean }) {
  const [form, setForm] = useState<ShopForm>({
    name: '',
    slug: '',
    description: '',
    shipping_from: 'New York, NY',
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#11131B] p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Launch GMS</h3>
            <p className="text-sm text-white/40">Create your marketplace storefront and seller workspace.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value, slug: prev.slug || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} placeholder="Shop name" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
          <input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') }))} placeholder="shop-slug" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
          <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Describe your catalog and brand voice" rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
          <input value={form.shipping_from} onChange={(event) => setForm((prev) => ({ ...prev, shipping_from: event.target.value }))} placeholder="Ships from" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name || !form.slug || saving} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40">{saving ? 'Creating...' : 'Create Shop'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (data: ProductForm) => void; saving: boolean }) {
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    image_url: '',
    price_cents: 0,
    inventory: 10,
    condition: 'new',
    brand: '',
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#11131B] p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold">Add Marketplace Product</h3>
          <button onClick={onClose} className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Product name" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
          <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Short description" rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
          <input value={form.image_url} onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))} placeholder="Image URL" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" step="0.01" value={form.price_cents ? (form.price_cents / 100).toFixed(2) : ''} onChange={(event) => setForm((prev) => ({ ...prev, price_cents: Math.round((Number(event.target.value) || 0) * 100) }))} placeholder="Price" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
            <input type="number" min="0" value={form.inventory} onChange={(event) => setForm((prev) => ({ ...prev, inventory: Number(event.target.value) || 0 }))} placeholder="Inventory" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.brand} onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))} placeholder="Brand" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
            <select value={form.condition} onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50">
              <option value="new">New</option>
              <option value="like_new">Like new</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name || form.price_cents <= 0 || saving} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40">{saving ? 'Saving...' : 'Publish Product'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MSPEnrollmentModal({ onClose, onEnroll, enrolling }: { onClose: () => void; onEnroll: () => void; enrolling: boolean }) {
  const tiers = [
    { name: 'New', pct: '15%', note: 'Launch your catalog' },
    { name: 'Rising', pct: '12%', note: '50+ orders, strong service' },
    { name: 'Established', pct: '10%', note: '200+ orders, proven retention' },
    { name: 'Partner', pct: '8%', note: 'Strategic merchants and marquee brands' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#11131B] p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Marketplace Seller Program</h3>
            <p className="text-sm text-white/40">Operate with FBM or FBG fulfillment, catalog governance, and seller payouts.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {tiers.map((tier) => (
            <div key={tier.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{tier.name}</span>
                <span className="text-sm font-bold text-indigo-400">{tier.pct}</span>
              </div>
              <p className="mt-2 text-xs text-white/45">{tier.note}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-100">
          Greggie MSP aligns marketplace sellers to catalog quality, fulfillment discipline, and transparent payout ops. Stripe Connect handles payouts. Stripe Tax handles checkout tax calculation.
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10">Cancel</button>
          <button onClick={onEnroll} disabled={enrolling} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40">{enrolling ? 'Enrolling...' : 'Join MSP'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MarketStudio({ onExit }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [savingShop, setSavingShop] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [shop, setShop] = useState<api.Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [program, setProgram] = useState<api.SellerProgram | null>(null);
  const [dashboard, setDashboard] = useState<api.SellerDashboard | null>(null);
  const [orders, setOrders] = useState<api.SellerOrderView[]>([]);
  const [payouts, setPayouts] = useState<api.SellerPayout[]>([]);
  const [analytics, setAnalytics] = useState<api.SellerAnalyticsDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '', banner_url: '', logo_url: '', return_policy: '', shipping_from: '' });
  const programIsActive = program?.status === 'active';

  const ensureAuth = useCallback(async () => {
    if (!api.getToken()) {
      await api.devLogin();
    }
  }, []);

  const loadPrograms = useCallback(async () => {
    try {
      const status = await api.getProgramStatus('msp');
      setProgram(status.program);
    } catch {
      setProgram(null);
    }
  }, []);

  const loadShop = useCallback(async () => {
    try {
      const currentShop = await api.getMyShop();
      setShop(currentShop);
      setSettingsForm({
        name: currentShop.name,
        description: currentShop.description ?? '',
        banner_url: currentShop.banner_url ?? '',
        logo_url: currentShop.logo_url ?? '',
        return_policy: currentShop.return_policy ?? '',
        shipping_from: currentShop.shipping_from ?? '',
      });
    } catch {
      setShop(null);
      setProducts([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const nextProducts = await api.getMyShopProducts();
      setProducts(nextProducts);
    } catch {
      setProducts([]);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!programIsActive) {
      setDashboard(null);
      setPayouts([]);
      return;
    }
    try {
      const [nextDashboard, nextPayouts] = await Promise.all([
        api.getMSPDashboard(),
        api.getSellerPayouts('msp', { limit: 20 }),
      ]);
      setDashboard(nextDashboard);
      setPayouts(nextPayouts);
    } catch {
      setDashboard(null);
      setPayouts([]);
    }
  }, [programIsActive]);

  const loadOrders = useCallback(async () => {
    if (!programIsActive) {
      setOrders([]);
      return;
    }
    try {
      const nextOrders = await api.getSellerOrders('msp', { limit: 50 });
      setOrders(nextOrders);
    } catch {
      setOrders([]);
    }
  }, [programIsActive]);

  const loadAnalytics = useCallback(async () => {
    if (!programIsActive) {
      setAnalytics([]);
      return;
    }
    try {
      const nextAnalytics = await api.getSellerAnalytics('msp');
      setAnalytics(nextAnalytics);
    } catch {
      setAnalytics([]);
    }
  }, [programIsActive]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureAuth();
        await Promise.all([loadPrograms(), loadShop()]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to initialize Market Studio');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [ensureAuth, loadPrograms, loadShop]);

  useEffect(() => {
    if (shop) {
      loadProducts();
    }
  }, [shop, loadProducts]);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, loadAnalytics, loadDashboard, loadOrders]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const nextProgram = await api.enrollProgram('msp');
      setProgram(nextProgram);
      setShowEnrollModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll in MSP');
    } finally {
      setEnrolling(false);
    }
  };

  const handleCreateShop = async (form: ShopForm) => {
    setSavingShop(true);
    setError(null);
    try {
      const nextShop = await api.createShop(form);
      setShop(nextShop);
      setSettingsForm({
        name: nextShop.name,
        description: nextShop.description ?? '',
        banner_url: nextShop.banner_url ?? '',
        logo_url: nextShop.logo_url ?? '',
        return_policy: nextShop.return_policy ?? '',
        shipping_from: nextShop.shipping_from ?? form.shipping_from,
      });
      setShowShopModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shop');
    } finally {
      setSavingShop(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingShop(true);
    setError(null);
    try {
      await api.updateMyShop(settingsForm);
      setShop((prev) => prev ? { ...prev, ...settingsForm } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shop settings');
    } finally {
      setSavingShop(false);
    }
  };

  const handleCreateProduct = async (form: ProductForm) => {
    setSavingProduct(true);
    setError(null);
    try {
      const nextProduct = await api.createShopProduct({ ...form, sale_type: 'buy_now' });
      setProducts((prev) => [nextProduct, ...prev]);
      setShowProductModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleArchiveProduct = async (productId: string) => {
    try {
      await api.archiveShopProduct(productId);
      setProducts((prev) => prev.filter((product) => product.id !== productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive product');
    }
  };

  const handleAdvanceOrder = async (order: api.SellerOrderView, status: 'processing' | 'shipped' | 'delivered') => {
    try {
      await api.updateOrderFulfillment(order.id, { status });
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fulfillment');
    }
  };

  const tabs = useMemo(() => ([
    { id: 'dashboard' as const, label: 'Dashboard', icon: Store },
    { id: 'products' as const, label: 'Products', icon: Package },
    { id: 'orders' as const, label: 'Orders', icon: Truck },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ]), []);

  const analyticsSummary = analytics.reduce((acc, day) => ({
    revenue: acc.revenue + day.revenue_cents,
    orders: acc.orders + day.orders_count,
    units: acc.units + day.units_sold,
    views: acc.views + day.views,
  }), { revenue: 0, orders: 0, units: 0, views: 0 });

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0A0A0F] text-white">
        <div className="flex flex-col items-center gap-4">
          <ButterflyIcon size={48} />
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0A0A0F] text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0D0D14] px-5 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"><ArrowLeft size={18} /></button>
          <ButterflyIcon size={24} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold">Greggie Market Studio</h1>
              {program && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getProgramStatusTone(program.status)}`}>{programIsActive ? program.tier : getProgramStatusLabel(program.status)}</span>}
            </div>
            <p className="text-[11px] text-white/40">Catalog commerce, fulfillment, payouts, analytics.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {shop && <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">{shop.name}</span>}
          <button onClick={() => setShowProductModal(true)} disabled={!shop} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"><Plus size={14} className="inline mr-1" />Product</button>
        </div>
      </div>

      {!program && (
        <div className="flex items-center justify-between border-b border-indigo-500/20 bg-indigo-500/10 px-5 py-3 text-sm">
          <div className="flex items-center gap-2 text-indigo-200"><ShieldCheck size={16} className="text-indigo-400" />Join MSP to unlock seller analytics, fulfillment, and payouts.</div>
          <button onClick={() => setShowEnrollModal(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500">Join MSP</button>
        </div>
      )}

      {program && !programIsActive && (
        <div className={`flex items-center justify-between border-b px-5 py-3 text-sm ${program.status === 'pending' || program.status === 'approved' ? 'border-amber-500/20 bg-amber-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
          <div className="flex items-center gap-2 text-white/85">
            <ShieldCheck size={16} className={program.status === 'pending' || program.status === 'approved' ? 'text-amber-300' : 'text-red-300'} />
            <span>
              {program.status === 'pending' && 'Your MSP application is under review. Analytics, fulfillment controls, and payout reporting will unlock after activation.'}
              {program.status === 'approved' && 'Your MSP application is approved and awaiting activation. Seller operations will unlock once the program goes live.'}
              {program.status === 'suspended' && 'Your MSP access is suspended. Seller operations are temporarily unavailable.'}
              {program.status === 'rejected' && 'Your MSP application needs attention before fulfillment and payout operations can be enabled.'}
              {program.status === 'closed' && 'Your MSP enrollment is closed. Seller operations stay disabled until you re-enroll.'}
            </span>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getProgramStatusTone(program.status)}`}>{getProgramStatusLabel(program.status)}</span>
        </div>
      )}

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-2 text-sm text-red-300">{error}</div>
      )}

      {!shop ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5"><Store size={42} className="text-indigo-300" /></div>
          <div>
            <h2 className="text-2xl font-bold">Stand up your marketplace operation</h2>
            <p className="mt-2 max-w-xl text-sm text-white/45">Create a verified storefront, manage fulfillment, and run your MSP business from one Greggie control plane.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowShopModal(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">Create Shop</button>
            {!program && <button onClick={() => setShowEnrollModal(true)} className="rounded-xl bg-white/5 px-5 py-3 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10">Review MSP</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="flex border-b border-white/10 bg-[#0D0D14]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${selected ? 'border-indigo-500 bg-indigo-500/5 text-indigo-300' : 'border-transparent text-white/40 hover:bg-white/5 hover:text-white/75'}`}>
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'dashboard' && (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-2 flex items-center gap-2 text-white/40"><DollarSign size={14} />Revenue</div><div className="text-2xl font-bold text-green-400">${((dashboard?.total_revenue_cents ?? 0) / 100).toLocaleString()}</div></div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-2 flex items-center gap-2 text-white/40"><Package size={14} />Listings</div><div className="text-2xl font-bold">{dashboard?.active_listings ?? products.length}</div></div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-2 flex items-center gap-2 text-white/40"><Truck size={14} />Pending Orders</div><div className="text-2xl font-bold text-yellow-400">{dashboard?.pending_orders ?? 0}</div></div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-2 flex items-center gap-2 text-white/40"><CheckCircle2 size={14} />Shipped</div><div className="text-2xl font-bold text-indigo-300">{dashboard?.shipped_orders ?? 0}</div></div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold">Operations Snapshot</h2>
                        <p className="text-sm text-white/40">MSP program performance, payout cadence, and catalog health.</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${program ? getProgramStatusTone(program.status) : 'bg-white/5 text-white/60 border border-white/10'}`}>{program ? (programIsActive ? program.tier : getProgramStatusLabel(program.status)) : 'not enrolled'}</span>
                    </div>
                    {programIsActive ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-black/20 p-4"><div className="text-xs uppercase tracking-wider text-white/35">Pending payouts</div><div className="mt-2 text-xl font-bold text-yellow-300">${((dashboard?.pending_payouts_cents ?? 0) / 100).toLocaleString()}</div></div>
                        <div className="rounded-xl bg-black/20 p-4"><div className="text-xs uppercase tracking-wider text-white/35">Paid payouts</div><div className="mt-2 text-xl font-bold text-green-400">${((dashboard?.paid_payouts_cents ?? 0) / 100).toLocaleString()}</div></div>
                        <div className="rounded-xl bg-black/20 p-4"><div className="text-xs uppercase tracking-wider text-white/35">Commission</div><div className="mt-2 text-xl font-bold text-indigo-300">{dashboard?.commission_pct ?? 15}%</div></div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-black/20 p-4 text-sm text-white/45">
                        Seller operations are staged behind MSP activation. You can keep building your storefront and catalog while Greggie reviews the application.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h2 className="text-base font-bold">Recent Payouts</h2>
                    <div className="mt-4 space-y-3">
                      {payouts.length === 0 ? (
                        <div className="rounded-xl bg-black/20 p-4 text-sm text-white/40">{programIsActive ? 'Payouts will appear here after your first settled orders.' : 'Payout history will appear once MSP is active and orders begin settling.'}</div>
                      ) : payouts.slice(0, 6).map((payout) => (
                        <div key={payout.id} className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold">${(payout.net_cents / 100).toFixed(2)}</div>
                            <div className="text-xs text-white/35">Gross ${(payout.gross_cents / 100).toFixed(2)} • Fee ${(payout.commission_cents / 100).toFixed(2)}</div>
                          </div>
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/55">{payout.payout_status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">Catalog</h2>
                    <p className="text-sm text-white/40">Manage marketplace listings and inventory positioning.</p>
                  </div>
                  <button onClick={() => setShowProductModal(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"><Plus size={14} className="mr-1 inline" />Add Product</button>
                </div>
                <div className="grid gap-3">
                  {products.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/40">No products yet. Publish your first catalog listing.</div>
                  ) : products.map((product) => (
                    <div key={product.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <img src={product.mediaUrl || 'https://placehold.co/96x96/111827/e5e7eb?text=G'} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold">{product.name}</div>
                        <div className="mt-1 text-sm text-white/40 line-clamp-2">{product.description}</div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-white/45">
                          <span>${product.price.toFixed(2)}</span>
                          <span>{product.inventory} in stock</span>
                          <span className="uppercase">{product.condition ?? 'new'}</span>
                        </div>
                      </div>
                      <button onClick={() => handleArchiveProduct(product.id)} className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"><Archive size={14} className="mr-1 inline" />Archive</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold">Order Operations</h2>
                  <p className="text-sm text-white/40">Advance fulfillment states and keep buyer delivery expectations accurate.</p>
                </div>
                {!programIsActive && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Fulfillment controls unlock after MSP activation. Store setup can continue while your application is in review.
                  </div>
                )}
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/40">{programIsActive ? 'No marketplace orders yet.' : 'Marketplace seller orders will appear here after MSP activation.'}</div>
                  ) : orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold">Order #{order.id.slice(0, 8)}</div>
                          <div className="mt-1 text-xs text-white/40">{new Date(order.created_at).toLocaleString()} • {order.buyer_email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-400">${(order.total_cents / 100).toFixed(2)}</div>
                          <div className="mt-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">{order.status}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.status === 'pending' && <button onClick={() => handleAdvanceOrder(order, 'processing')} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500">Confirm</button>}
                        {(order.status === 'pending' || order.status === 'processing' || order.status === 'confirmed') && <button onClick={() => handleAdvanceOrder(order, 'shipped')} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500">Mark Shipped</button>}
                        {order.status === 'shipped' && <button onClick={() => handleAdvanceOrder(order, 'delivered')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-500">Mark Delivered</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold">Seller Analytics</h2>
                  <p className="text-sm text-white/40">Daily MSP revenue, orders, units, and traffic efficiency.</p>
                </div>
                {!programIsActive && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Analytics begin populating once the seller program is active and marketplace activity starts flowing through MSP.
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-wider text-white/35">Revenue</div><div className="mt-2 text-xl font-bold text-green-400">${(analyticsSummary.revenue / 100).toLocaleString()}</div></div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-wider text-white/35">Orders</div><div className="mt-2 text-xl font-bold">{analyticsSummary.orders}</div></div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-wider text-white/35">Units</div><div className="mt-2 text-xl font-bold">{analyticsSummary.units}</div></div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs uppercase tracking-wider text-white/35">Views</div><div className="mt-2 text-xl font-bold text-indigo-300">{analyticsSummary.views}</div></div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-indigo-300" /><h3 className="text-sm font-semibold">Daily Breakdown</h3></div>
                  <div className="space-y-2">
                    {analytics.length === 0 ? (
                      <div className="rounded-xl bg-black/20 p-4 text-sm text-white/40">Analytics will populate once orders and traffic start flowing.</div>
                    ) : analytics.map((day) => (
                      <div key={day.date} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-3 rounded-xl bg-black/20 px-4 py-3 text-sm">
                        <div>{day.date}</div>
                        <div>${(day.revenue_cents / 100).toFixed(2)}</div>
                        <div>{day.orders_count} orders</div>
                        <div>{day.units_sold} units</div>
                        <div>{day.conversion_rate.toFixed(2)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold">Storefront Settings</h2>
                  <p className="text-sm text-white/40">Control storefront presentation, shipping origin, and buyer trust copy.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <input value={settingsForm.name} onChange={(event) => setSettingsForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Store name" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
                  <input value={settingsForm.shipping_from} onChange={(event) => setSettingsForm((prev) => ({ ...prev, shipping_from: event.target.value }))} placeholder="Shipping from" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
                  <input value={settingsForm.logo_url} onChange={(event) => setSettingsForm((prev) => ({ ...prev, logo_url: event.target.value }))} placeholder="Logo URL" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
                  <input value={settingsForm.banner_url} onChange={(event) => setSettingsForm((prev) => ({ ...prev, banner_url: event.target.value }))} placeholder="Banner URL" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
                </div>
                <textarea value={settingsForm.description} onChange={(event) => setSettingsForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Store description" rows={4} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
                <textarea value={settingsForm.return_policy} onChange={(event) => setSettingsForm((prev) => ({ ...prev, return_policy: event.target.value }))} placeholder="Return policy" rows={4} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50" />
                <button onClick={handleSaveSettings} disabled={savingShop} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"><Save size={14} className="mr-1 inline" />{savingShop ? 'Saving...' : 'Save Settings'}</button>
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {showShopModal && <ShopModal onClose={() => setShowShopModal(false)} onSave={handleCreateShop} saving={savingShop} />}
      </AnimatePresence>
      <AnimatePresence>
        {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} onSave={handleCreateProduct} saving={savingProduct} />}
      </AnimatePresence>
      <AnimatePresence>
        {showEnrollModal && <MSPEnrollmentModal onClose={() => setShowEnrollModal(false)} onEnroll={handleEnroll} enrolling={enrolling} />}
      </AnimatePresence>
    </div>
  );
}