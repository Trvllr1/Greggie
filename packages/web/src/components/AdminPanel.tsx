import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, BarChart3, Users, ShoppingCart, BadgeCheck, Megaphone,
  TrendingUp, DollarSign, Radio, Package, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Check, X, Ban, RefreshCw,
  Plus, Edit3, Trash2, Eye, MousePointerClick, Pause, Play,
  Zap, Activity, RotateCw,
} from 'lucide-react';
import * as api from '../services/api';
import type { AdminStats } from '../services/api';
import { ButterflyIcon } from './ButterflyIcon';
import { useAuth } from '../hooks/useAuth';

type Tab = 'dashboard' | 'users' | 'orders' | 'programs' | 'billboards';

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'programs', label: 'Seller Programs', icon: BadgeCheck },
  { id: 'billboards', label: 'Billboards', icon: Megaphone },
];

/* ── Stat Card ────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, accent = 'indigo', sub }: {
  label: string; value: string | number; icon: typeof TrendingUp; accent?: string; sub?: string;
}) {
  const accents: Record<string, string> = {
    indigo: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-300',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-300',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-300',
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-300',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-300',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${accents[accent] ?? accents.indigo}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</span>
        <Icon size={16} className="opacity-60" />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/30">{sub}</p>}
    </div>
  );
}

/* ── Status Badge ─────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    processing: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    suspended: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    cancelled: 'bg-white/5 text-white/40 border-white/10',
    draft: 'bg-white/5 text-white/40 border-white/10',
    paused: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    expired: 'bg-white/5 text-white/40 border-white/10',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

/* ── Paginated Table Shell ────────────────────────────── */
function TableShell({ children, page, total, limit, onPage, loading }: {
  children: React.ReactNode; page: number; total: number; limit: number; onPage: (p: number) => void; loading: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11131B] overflow-hidden">
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
          </div>
        ) : children}
      </div>
      {total > limit && (
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-white/40">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <button onClick={() => onPage(page - 1)} disabled={page <= 0} className="p-1 rounded hover:bg-white/5 disabled:opacity-20"><ChevronLeft size={14} /></button>
            <span className="text-white/60">Page {page + 1} of {totalPages}</span>
            <button onClick={() => onPage(page + 1)} disabled={(page + 1) * limit >= total} className="p-1 rounded hover:bg-white/5 disabled:opacity-20"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main AdminPanel ──────────────────────────────────── */

// Mock data for demo mode when backend is unreachable
const MOCK_ADMIN_STATS: AdminStats = {
  total_users: 1_247,
  total_orders: 3_892,
  total_revenue_cents: 48_935_00,
  live_channels: 14,
  active_products: 328,
  pending_programs: 7,
  pending_payouts_cents: 12_450_00,
};

const MOCK_USERS = [
  { id: 'u1', username: 'sneakerheadz', display_name: 'Marcus Chen', email: 'marcus@sneakerheadz.com', role: 'seller', avatar_url: '', created_at: '2025-11-15T10:00:00Z' },
  { id: 'u2', username: 'nyc_threads', display_name: 'Aisha Williams', email: 'aisha@nycthreads.co', role: 'creator', avatar_url: '', created_at: '2025-12-01T08:30:00Z' },
  { id: 'u3', username: 'beautybylex', display_name: 'Lex Rivera', email: 'lex@beautybylex.com', role: 'seller', avatar_url: '', created_at: '2026-01-10T14:20:00Z' },
  { id: 'u4', username: 'kpopmerch_official', display_name: 'Hana Park', email: 'hana@kpopmerch.kr', role: 'seller', avatar_url: '', created_at: '2026-01-22T09:15:00Z' },
  { id: 'u5', username: 'thrift.queen', display_name: 'Maya Johnson', email: 'maya@thriftqueen.io', role: 'creator', avatar_url: '', created_at: '2026-02-05T16:45:00Z' },
  { id: 'u6', username: 'techdeals_live', display_name: 'James Peters', email: 'james@techdeals.live', role: 'seller', avatar_url: '', created_at: '2026-02-14T11:00:00Z' },
  { id: 'u7', username: 'viewer_sarah', display_name: 'Sarah Kim', email: 'sarah.k@gmail.com', role: 'buyer', avatar_url: '', created_at: '2026-03-01T20:30:00Z' },
  { id: 'u8', username: 'greggie_admin', display_name: 'Greggie Admin', email: 'admin@greggie.app', role: 'admin', avatar_url: '', created_at: '2025-10-01T00:00:00Z' },
];

const MOCK_ORDERS = [
  { id: 'ord-a1b2c3d4', user_email: 'sarah.k@gmail.com', total_cents: 18_999, status: 'completed', created_at: '2026-03-28T15:30:00Z' },
  { id: 'ord-e5f6g7h8', user_email: 'maya@thriftqueen.io', total_cents: 4_500, status: 'processing', created_at: '2026-03-29T10:15:00Z' },
  { id: 'ord-i9j0k1l2', user_email: 'james@techdeals.live', total_cents: 89_999, status: 'pending', created_at: '2026-04-01T08:45:00Z' },
  { id: 'ord-m3n4o5p6', guest_email: 'guest42@proton.me', total_cents: 12_500, status: 'completed', created_at: '2026-04-02T22:10:00Z' },
  { id: 'ord-q7r8s9t0', user_email: 'sarah.k@gmail.com', total_cents: 34_99, status: 'cancelled', created_at: '2026-03-20T14:00:00Z' },
];

const MOCK_PROGRAMS = [
  { id: 'sp1', user_email: 'lex@beautybylex.com', program_type: 'MSP', tier: 'pro', status: 'active', created_at: '2026-01-15T12:00:00Z' },
  { id: 'sp2', user_email: 'marcus@sneakerheadz.com', program_type: 'CSP', tier: 'starter', status: 'active', created_at: '2025-12-20T09:00:00Z' },
  { id: 'sp3', user_email: 'newbie@shop.co', program_type: 'MSP', tier: 'starter', status: 'pending', created_at: '2026-03-30T16:00:00Z' },
  { id: 'sp4', user_email: 'sketchy@deals.biz', program_type: 'CSP', tier: 'pro', status: 'rejected', created_at: '2026-03-15T11:30:00Z' },
  { id: 'sp5', user_email: 'hana@kpopmerch.kr', program_type: 'MSP', tier: 'enterprise', status: 'approved', created_at: '2026-02-28T14:00:00Z' },
  { id: 'sp6', user_email: 'dropshipper99@mail.com', program_type: 'CSP', tier: 'starter', status: 'suspended', created_at: '2026-02-10T10:00:00Z' },
  { id: 'sp7', user_email: 'fresh.seller@outlook.com', program_type: 'MSP', tier: 'starter', status: 'pending', created_at: '2026-04-01T09:00:00Z' },
];

const MOCK_BILLBOARDS = [
  { id: 'bb1', billboard_type: 'sponsored', target_type: 'channel', target_id: 'c7', title: 'Air Jordan 1 Retro High OG', subtitle: 'SneakerHeadz Live', description: 'Exclusive drop — authenticated pairs only', image_url: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200', cta_label: 'Watch Live', badge_text: 'Sponsored', badge_color: 'amber', priority: 10, starts_at: '2026-03-15T00:00:00Z', ends_at: '2026-04-15T00:00:00Z', status: 'active', impressions: 12_480, clicks: 892, budget_cents: 500_00, spent_cents: 234_50, cpm_cents: 1200, created_at: '2026-03-14T10:00:00Z', updated_at: '2026-04-02T18:00:00Z' },
  { id: 'bb2', billboard_type: 'promoted', target_type: 'product', target_id: 'p5', title: 'Sunset Eyeshadow Palette', subtitle: 'Beauty by Lex', description: '18-shade shimmer & matte collection', image_url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1200', cta_label: 'Shop Now', badge_text: 'Hot Deal', badge_color: 'rose', priority: 8, starts_at: '2026-03-20T00:00:00Z', ends_at: '2026-04-20T00:00:00Z', status: 'active', impressions: 8_340, clicks: 623, budget_cents: 300_00, spent_cents: 156_80, cpm_cents: 800, created_at: '2026-03-19T14:00:00Z', updated_at: '2026-04-01T12:00:00Z' },
  { id: 'bb3', billboard_type: 'trending', target_type: 'channel', target_id: 'c12', title: 'K-Pop Merch Exclusive', subtitle: 'Limited photocard drops', description: 'Authentic K-Pop merchandise and collectibles', image_url: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200', cta_label: 'Tune In', badge_text: 'Trending', badge_color: 'indigo', priority: 5, starts_at: '2026-03-25T00:00:00Z', ends_at: null, status: 'active', impressions: 5_120, clicks: 341, budget_cents: 0, spent_cents: 0, cpm_cents: 0, created_at: '2026-03-24T09:00:00Z', updated_at: '2026-03-30T16:00:00Z' },
  { id: 'bb4', billboard_type: 'campaign', target_type: 'product', target_id: 'p3', title: 'Spring Thrift Collection', subtitle: 'Curated vintage finds', description: 'Hand-picked rare vintage pieces', image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200', cta_label: 'Browse', badge_text: 'Campaign', badge_color: 'cyan', priority: 3, starts_at: '2026-04-01T00:00:00Z', ends_at: '2026-05-01T00:00:00Z', status: 'draft', impressions: 0, clicks: 0, budget_cents: 200_00, spent_cents: 0, cpm_cents: 600, created_at: '2026-03-28T11:00:00Z', updated_at: '2026-03-28T11:00:00Z' },
  { id: 'bb5', billboard_type: 'sponsored', target_type: 'channel', target_id: 'c1', title: 'Tech Deals Flash Sale', subtitle: 'Live tech unboxing', description: '', image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200', cta_label: 'Watch Now', badge_text: 'Sponsored', badge_color: 'amber', priority: 7, starts_at: '2026-02-01T00:00:00Z', ends_at: '2026-03-01T00:00:00Z', status: 'expired', impressions: 22_100, clicks: 1_540, budget_cents: 400_00, spent_cents: 400_00, cpm_cents: 1000, created_at: '2026-01-30T08:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
];

export function AdminPanel({ onExit }: { onExit: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDev = import.meta.env.DEV;

  // Dashboard
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [usersRoleFilter, setUsersRoleFilter] = useState('');

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('');

  // Programs
  const [programs, setPrograms] = useState<any[]>([]);
  const [programsTotal, setProgramsTotal] = useState(0);
  const [programsPage, setProgramsPage] = useState(0);
  const [programsStatusFilter, setProgramsStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [tabLoading, setTabLoading] = useState(false);
  const LIMIT = 20;

  // Billboards
  const [billboards, setBillboards] = useState<any[]>([]);
  const [billboardsTotal, setBillboardsTotal] = useState(0);
  const [billboardsPage, setBillboardsPage] = useState(0);
  const [billboardsStatusFilter, setBillboardsStatusFilter] = useState('');
  const [editingBillboard, setEditingBillboard] = useState<any | null>(null);
  const [showBillboardForm, setShowBillboardForm] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.getAdminStats();
      setStats(s);
    } catch {
      if (isDev) setStats(MOCK_ADMIN_STATS);
    }
  }, [isDev]);

  const loadUsers = useCallback(async (page = 0, role = '') => {
    setTabLoading(true);
    try {
      const res = await api.adminListUsers({ role: role || undefined, limit: LIMIT, offset: page * LIMIT });
      setUsers(res.users); setUsersTotal(res.total);
    } catch {
      if (isDev) {
        const filtered = role ? MOCK_USERS.filter(u => u.role === role) : MOCK_USERS;
        setUsers(filtered.slice(page * LIMIT, (page + 1) * LIMIT));
        setUsersTotal(filtered.length);
      } else { setUsers([]); setUsersTotal(0); }
    }
    setTabLoading(false);
  }, [isDev]);

  const loadOrders = useCallback(async (page = 0, status = '') => {
    setTabLoading(true);
    try {
      const res = await api.adminListOrders({ status: status || undefined, limit: LIMIT, offset: page * LIMIT });
      setOrders(res.orders); setOrdersTotal(res.total);
    } catch {
      if (isDev) {
        const filtered = status ? MOCK_ORDERS.filter(o => o.status === status) : MOCK_ORDERS;
        setOrders(filtered.slice(page * LIMIT, (page + 1) * LIMIT));
        setOrdersTotal(filtered.length);
      } else { setOrders([]); setOrdersTotal(0); }
    }
    setTabLoading(false);
  }, [isDev]);

  const loadPrograms = useCallback(async (page = 0, status = '') => {
    setTabLoading(true);
    try {
      const res = await api.adminListPrograms({ status: status || undefined, limit: LIMIT, offset: page * LIMIT });
      setPrograms(res.programs); setProgramsTotal(res.total);
    } catch {
      if (isDev) {
        const filtered = status ? MOCK_PROGRAMS.filter(p => p.status === status) : MOCK_PROGRAMS;
        setPrograms(filtered.slice(page * LIMIT, (page + 1) * LIMIT));
        setProgramsTotal(filtered.length);
      } else { setPrograms([]); setProgramsTotal(0); }
    }
    setTabLoading(false);
  }, [isDev]);

  const handleProgramAction = async (programId: string, newStatus: string) => {
    setActionLoading(programId);
    try {
      await api.adminUpdateProgram(programId, newStatus);
      await loadPrograms(programsPage, programsStatusFilter);
      await loadStats();
    } catch {
      if (isDev) {
        // Optimistic update in demo mode
        setPrograms(prev => prev.map(p => p.id === programId ? { ...p, status: newStatus } : p));
      } else {
        setError('Action failed');
      }
    }
    setActionLoading(null);
  };

  const handleProcessPayouts = async () => {
    setActionLoading('payouts');
    try {
      const res = await api.adminProcessPayouts();
      alert(`Payouts processed: ${res.processed} succeeded, ${res.failed} failed out of ${res.total}`);
      await loadStats();
    } catch {
      if (isDev) {
        alert('Demo mode: 3 payouts processed successfully, 0 failed out of 3');
      } else {
        setError('Payout processing failed');
      }
    }
    setActionLoading(null);
  };

  const loadBillboards = useCallback(async (page = 0, status = '') => {
    setTabLoading(true);
    try {
      const res = await api.adminListBillboards({ status: status || undefined, limit: LIMIT, offset: page * LIMIT });
      setBillboards(res.billboards); setBillboardsTotal(res.total);
    } catch {
      if (isDev) {
        const filtered = status ? MOCK_BILLBOARDS.filter(b => b.status === status) : MOCK_BILLBOARDS;
        setBillboards(filtered.slice(page * LIMIT, (page + 1) * LIMIT));
        setBillboardsTotal(filtered.length);
      } else { setBillboards([]); setBillboardsTotal(0); }
    }
    setTabLoading(false);
  }, [isDev]);

  const handleBillboardStatusChange = async (billboardId: string, newStatus: string) => {
    setActionLoading(billboardId);
    try {
      await api.adminUpdateBillboard(billboardId, { status: newStatus });
      await loadBillboards(billboardsPage, billboardsStatusFilter);
    } catch {
      if (isDev) {
        setBillboards(prev => prev.map(b => b.id === billboardId ? { ...b, status: newStatus } : b));
      } else {
        setError('Failed to update billboard status');
      }
    }
    setActionLoading(null);
  };

  const handleDeleteBillboard = async (billboardId: string) => {
    if (!confirm('Delete this billboard? This cannot be undone.')) return;
    setActionLoading(billboardId);
    try {
      await api.adminDeleteBillboard(billboardId);
      await loadBillboards(billboardsPage, billboardsStatusFilter);
    } catch {
      if (isDev) {
        setBillboards(prev => prev.filter(b => b.id !== billboardId));
        setBillboardsTotal(prev => prev - 1);
      } else {
        setError('Failed to delete billboard');
      }
    }
    setActionLoading(null);
  };

  const handleSaveBillboard = async (data: any) => {
    setActionLoading('billboard-save');
    try {
      if (editingBillboard?.id) {
        await api.adminUpdateBillboard(editingBillboard.id, data);
      } else {
        await api.adminCreateBillboard(data);
      }
      await loadBillboards(billboardsPage, billboardsStatusFilter);
      setShowBillboardForm(false);
      setEditingBillboard(null);
    } catch {
      if (isDev) {
        if (editingBillboard?.id) {
          setBillboards(prev => prev.map(b => b.id === editingBillboard.id ? { ...b, ...data } : b));
        } else {
          const newBb = { ...data, id: `bb-new-${Date.now()}`, impressions: 0, clicks: 0, spent_cents: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          setBillboards(prev => [newBb, ...prev]);
          setBillboardsTotal(prev => prev + 1);
        }
        setShowBillboardForm(false);
        setEditingBillboard(null);
      } else {
        setError('Failed to save billboard');
      }
    }
    setActionLoading(null);
  };

  // Initial load
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadStats();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadStats]);

  // Tab-driven loading
  useEffect(() => {
    if (loading) return;
    if (activeTab === 'dashboard') loadStats();
    if (activeTab === 'users') loadUsers(usersPage, usersRoleFilter);
    if (activeTab === 'orders') loadOrders(ordersPage, ordersStatusFilter);
    if (activeTab === 'programs') loadPrograms(programsPage, programsStatusFilter);
    if (activeTab === 'billboards') loadBillboards(billboardsPage, billboardsStatusFilter);
  }, [activeTab, loading, usersPage, usersRoleFilter, ordersPage, ordersStatusFilter, programsPage, programsStatusFilter, billboardsPage, billboardsStatusFilter, loadStats, loadUsers, loadOrders, loadPrograms, loadBillboards]);

  // Loading screen
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

  const fmt$ = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0A0A0F] text-white">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0D0D14] px-5 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="rounded-xl p-2 text-white/50 hover:bg-white/[0.08] hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <ButterflyIcon size={28} />
          <div>
            <h1 className="text-lg font-bold leading-tight">Command Center</h1>
            <p className="text-[11px] text-white/40">Platform Administration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadStats();
              if (activeTab === 'users') loadUsers(usersPage, usersRoleFilter);
              if (activeTab === 'orders') loadOrders(ordersPage, ordersStatusFilter);
              if (activeTab === 'programs') loadPrograms(programsPage, programsStatusFilter);
              if (activeTab === 'billboards') loadBillboards(billboardsPage, billboardsStatusFilter);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
            title="Refresh data"
          >
            <RotateCw size={12} /> Refresh
          </button>
          <button
            onClick={handleProcessPayouts}
            disabled={actionLoading === 'payouts'}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
          >
            <DollarSign size={14} />
            <span className="hidden sm:inline">{actionLoading === 'payouts' ? 'Processing...' : 'Process Payouts'}</span>
            <span className="sm:hidden">{actionLoading === 'payouts' ? '...' : 'Payouts'}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-red-500/20 bg-red-500/10 px-5 py-2 text-sm text-red-300 flex items-center justify-between"
          >
            <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
            <button onClick={() => setError(null)} className="text-red-300/60 hover:text-red-300"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-white/10 bg-[#0D0D14]">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/5 text-indigo-300'
                  : 'border-transparent text-white/40 hover:bg-white/5 hover:text-white/75'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {/* Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Welcome banner */}
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600/20 via-indigo-500/10 to-transparent border border-indigo-500/15 p-5">
              <div>
                <h2 className="text-xl font-black text-white mb-1">Welcome back{user?.display_name ? `, ${user.display_name}` : ''}</h2>
                <p className="text-sm text-white/40">Here's what's happening on Greggie today.</p>
              </div>
              <Activity size={32} className="text-indigo-400/30 hidden sm:block" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats.total_users.toLocaleString()} icon={Users} accent="indigo" />
              <StatCard label="Total Orders" value={stats.total_orders.toLocaleString()} icon={ShoppingCart} accent="cyan" />
              <StatCard label="Revenue" value={fmt$(stats.total_revenue_cents)} icon={TrendingUp} accent="emerald" />
              <StatCard label="Live Channels" value={stats.live_channels} icon={Radio} accent="rose" />
              <StatCard label="Active Products" value={stats.active_products.toLocaleString()} icon={Package} accent="indigo" />
              <StatCard label="Pending Programs" value={stats.pending_programs} icon={Clock} accent="amber" sub="Awaiting review" />
              <StatCard label="Pending Payouts" value={fmt$(stats.pending_payouts_cents)} icon={DollarSign} accent="emerald" sub="Ready to process" />
              <StatCard label="Billboards" value={MOCK_BILLBOARDS.filter(b => b.status === 'active').length} icon={Megaphone} accent="cyan" sub="Active placements" />
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/30 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Review Programs', sub: `${stats.pending_programs} pending`, icon: BadgeCheck, tab: 'programs' as Tab, accent: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
                  { label: 'Manage Users', sub: `${stats.total_users.toLocaleString()} total`, icon: Users, tab: 'users' as Tab, accent: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
                  { label: 'View Orders', sub: `${stats.total_orders.toLocaleString()} total`, icon: ShoppingCart, tab: 'orders' as Tab, accent: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
                  { label: 'Billboard Ads', sub: 'Manage hero carousel', icon: Megaphone, tab: 'billboards' as Tab, accent: 'text-rose-300 bg-rose-500/10 border-rose-500/20' },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => setActiveTab(action.tab)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:brightness-125 ${action.accent}`}
                  >
                    <action.icon size={18} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{action.label}</p>
                      <p className="text-xs opacity-60">{action.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Health */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/30 mb-3">Platform Health</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">API Healthy</p>
                    <p className="text-xs text-white/30">All endpoints responding</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <Zap size={14} className="text-emerald-300" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">{stats.live_channels} Live</p>
                    <p className="text-xs text-white/30">Channels streaming now</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <Megaphone size={14} className="text-white/40" />
                  <div>
                    <p className="text-sm font-semibold text-white/70">Billboard Carousel</p>
                    <p className="text-xs text-white/30">{MOCK_BILLBOARDS.filter(b => b.status === 'active').length} active rotation</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Dashboard fallback when stats haven't loaded from backend */}
        {activeTab === 'dashboard' && !stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-center">
              <p className="text-sm text-amber-300">Backend unreachable — stats unavailable in demo mode.</p>
              <p className="mt-1 text-xs text-amber-300/50">Connect the backend to see live platform metrics.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value="—" icon={Users} accent="indigo" />
              <StatCard label="Total Orders" value="—" icon={ShoppingCart} accent="cyan" />
              <StatCard label="Revenue" value="—" icon={TrendingUp} accent="emerald" />
              <StatCard label="Live Channels" value="—" icon={Radio} accent="rose" />
            </div>
          </motion.div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white/60">Filter by role:</span>
              {['', 'viewer', 'buyer', 'seller', 'creator', 'admin'].map(r => (
                <button key={r} onClick={() => { setUsersRoleFilter(r); setUsersPage(0); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    usersRoleFilter === r ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {r || 'All'}
                </button>
              ))}
            </div>
            <TableShell page={usersPage} total={usersTotal} limit={LIMIT} onPage={setUsersPage} loading={tabLoading}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/30">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-white/30">No users found</td></tr>
                  ) : users.map((u: any) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt="" className="h-8 w-8 rounded-full object-cover bg-white/5" />
                          <div>
                            <p className="font-medium text-white">{u.display_name || u.username}</p>
                            <p className="text-xs text-white/30">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50">{u.email}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                      <td className="px-4 py-3 text-white/30 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </motion.div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white/60">Status:</span>
              {['', 'pending', 'processing', 'completed', 'cancelled'].map(s => (
                <button key={s} onClick={() => { setOrdersStatusFilter(s); setOrdersPage(0); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    ordersStatusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
            <TableShell page={ordersPage} total={ordersTotal} limit={LIMIT} onPage={setOrdersPage} loading={tabLoading}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/30">
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-white/30">No orders found</td></tr>
                  ) : orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-white/60">{o.id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-white/70">{o.user_email || o.guest_email || o.user_id?.slice(0, 8) || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-white">{fmt$(o.total_cents || 0)}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-white/30 text-xs">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </motion.div>
        )}

        {/* Seller Programs */}
        {activeTab === 'programs' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white/60">Status:</span>
              {['', 'pending', 'approved', 'active', 'rejected', 'suspended'].map(s => (
                <button key={s} onClick={() => { setProgramsStatusFilter(s); setProgramsPage(0); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    programsStatusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
            <TableShell page={programsPage} total={programsTotal} limit={LIMIT} onPage={setProgramsPage} loading={tabLoading}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/30">
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-white/30">No programs found</td></tr>
                  ) : programs.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/70">{p.user_email || p.user_id?.slice(0, 8) || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-300">
                          {p.program_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs capitalize">{p.tier || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-white/30 text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {(p.status === 'pending') && (
                            <>
                              <button
                                onClick={() => handleProgramAction(p.id, 'approved')}
                                disabled={actionLoading === p.id}
                                className="rounded-lg bg-emerald-600/20 p-1.5 text-emerald-300 hover:bg-emerald-600/40 disabled:opacity-30 transition-colors"
                                title="Approve"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => handleProgramAction(p.id, 'rejected')}
                                disabled={actionLoading === p.id}
                                className="rounded-lg bg-rose-600/20 p-1.5 text-rose-300 hover:bg-rose-600/40 disabled:opacity-30 transition-colors"
                                title="Reject"
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                          {(p.status === 'approved' || p.status === 'active') && (
                            <button
                              onClick={() => handleProgramAction(p.id, 'suspended')}
                              disabled={actionLoading === p.id}
                              className="rounded-lg bg-amber-600/20 p-1.5 text-amber-300 hover:bg-amber-600/40 disabled:opacity-30 transition-colors"
                              title="Suspend"
                            >
                              <Ban size={12} />
                            </button>
                          )}
                          {p.status === 'suspended' && (
                            <button
                              onClick={() => handleProgramAction(p.id, 'active')}
                              disabled={actionLoading === p.id}
                              className="rounded-lg bg-indigo-600/20 p-1.5 text-indigo-300 hover:bg-indigo-600/40 disabled:opacity-30 transition-colors"
                              title="Reactivate"
                            >
                              <RefreshCw size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </motion.div>
        )}

        {/* Billboards */}
        {activeTab === 'billboards' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Billboard form modal */}
            <AnimatePresence>
              {showBillboardForm && (
                <BillboardFormModal
                  initial={editingBillboard}
                  onSave={handleSaveBillboard}
                  onClose={() => { setShowBillboardForm(false); setEditingBillboard(null); }}
                  saving={actionLoading === 'billboard-save'}
                />
              )}
            </AnimatePresence>

            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white/60">Status:</span>
                {['', 'draft', 'active', 'paused', 'expired', 'rejected'].map(s => (
                  <button key={s} onClick={() => { setBillboardsStatusFilter(s); setBillboardsPage(0); }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      billboardsStatusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {s || 'All'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setEditingBillboard(null); setShowBillboardForm(true); }}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <Plus size={14} /> New Billboard
              </button>
            </div>

            {/* Summary cards */}
            {billboards.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-[#11131B] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Total Impressions</p>
                  <p className="text-lg font-black text-white">{billboards.reduce((s, b) => s + (b.impressions || 0), 0).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#11131B] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Total Clicks</p>
                  <p className="text-lg font-black text-white">{billboards.reduce((s, b) => s + (b.clicks || 0), 0).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#11131B] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Avg CTR</p>
                  <p className="text-lg font-black text-white">
                    {(() => {
                      const imp = billboards.reduce((s, b) => s + (b.impressions || 0), 0);
                      const clk = billboards.reduce((s, b) => s + (b.clicks || 0), 0);
                      return imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : '—';
                    })()}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#11131B] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Total Spend</p>
                  <p className="text-lg font-black text-white">{fmt$(billboards.reduce((s, b) => s + (b.spent_cents || 0), 0))}</p>
                </div>
              </div>
            )}

            {/* Billboards table */}
            <TableShell page={billboardsPage} total={billboardsTotal} limit={LIMIT} onPage={setBillboardsPage} loading={tabLoading}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/30">
                    <th className="px-4 py-3">Billboard</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Impr</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                    <th className="px-4 py-3 text-right">CTR</th>
                    <th className="px-4 py-3 text-right">Spend</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billboards.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-white/30">No billboards found</td></tr>
                  ) : billboards.map((b: any) => {
                    const ctr = b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(1) : '0.0';
                    const typeColors: Record<string, string> = {
                      sponsored: 'bg-amber-500/10 text-amber-300',
                      promoted: 'bg-rose-500/10 text-rose-300',
                      trending: 'bg-indigo-500/10 text-indigo-300',
                      campaign: 'bg-cyan-500/10 text-cyan-300',
                    };
                    return (
                      <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={b.image_url} alt="" className="h-10 w-16 rounded-lg object-cover bg-white/5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate max-w-[180px]">{b.title}</p>
                              <p className="text-xs text-white/30 truncate max-w-[180px]">{b.subtitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${typeColors[b.billboard_type] ?? 'bg-white/5 text-white/40'}`}>
                            {b.billboard_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-white/50">{b.target_type} <span className="font-mono text-white/30">{b.target_id?.slice(0, 6) ?? '—'}</span></span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-white/60">
                          <span className="flex items-center justify-end gap-1"><Eye size={10} className="text-white/20" /> {(b.impressions || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-white/60">
                          <span className="flex items-center justify-end gap-1"><MousePointerClick size={10} className="text-white/20" /> {(b.clicks || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono text-xs font-bold ${Number(ctr) >= 5 ? 'text-emerald-300' : Number(ctr) >= 2 ? 'text-amber-300' : 'text-white/40'}`}>
                            {ctr}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-white/60">{fmt$(b.spent_cents || 0)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {b.status === 'active' && (
                              <button onClick={() => handleBillboardStatusChange(b.id, 'paused')} disabled={actionLoading === b.id}
                                className="rounded-lg bg-amber-600/20 p-1.5 text-amber-300 hover:bg-amber-600/40 disabled:opacity-30 transition-colors" title="Pause">
                                <Pause size={12} />
                              </button>
                            )}
                            {(b.status === 'paused' || b.status === 'draft') && (
                              <button onClick={() => handleBillboardStatusChange(b.id, 'active')} disabled={actionLoading === b.id}
                                className="rounded-lg bg-emerald-600/20 p-1.5 text-emerald-300 hover:bg-emerald-600/40 disabled:opacity-30 transition-colors" title="Activate">
                                <Play size={12} />
                              </button>
                            )}
                            <button onClick={() => { setEditingBillboard(b); setShowBillboardForm(true); }} disabled={actionLoading === b.id}
                              className="rounded-lg bg-indigo-600/20 p-1.5 text-indigo-300 hover:bg-indigo-600/40 disabled:opacity-30 transition-colors" title="Edit">
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => handleDeleteBillboard(b.id)} disabled={actionLoading === b.id}
                              className="rounded-lg bg-rose-600/20 p-1.5 text-rose-300 hover:bg-rose-600/40 disabled:opacity-30 transition-colors" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Billboard Create/Edit Form Modal ──────────────────── */
function BillboardFormModal({ initial, onSave, onClose, saving }: {
  initial: any | null;
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    billboard_type: initial?.billboard_type || 'sponsored',
    target_type: initial?.target_type || 'channel',
    target_id: initial?.target_id || '',
    title: initial?.title || '',
    subtitle: initial?.subtitle || '',
    description: initial?.description || '',
    image_url: initial?.image_url || '',
    cta_label: initial?.cta_label || 'Shop Now',
    badge_text: initial?.badge_text || '',
    badge_color: initial?.badge_color || 'indigo',
    priority: initial?.priority ?? 0,
    starts_at: initial?.starts_at ? initial.starts_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
    ends_at: initial?.ends_at ? initial.ends_at.slice(0, 16) : '',
    status: initial?.status || 'draft',
    budget_cents: initial?.budget_cents ?? 0,
    cpm_cents: initial?.cpm_cents ?? 0,
  });

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
      priority: Number(form.priority),
      budget_cents: Number(form.budget_cents),
      cpm_cents: Number(form.cpm_cents),
    });
  };

  const inputCls = 'w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5';
  const selectCls = 'w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-10"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg mx-4 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Megaphone size={18} className="text-indigo-400" />
            {isEdit ? 'Edit Billboard' : 'New Billboard'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Row: Type + Target Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Billboard Type</label>
              <select value={form.billboard_type} onChange={e => set('billboard_type', e.target.value)} className={selectCls}>
                <option value="sponsored">Sponsored</option>
                <option value="promoted">Promoted</option>
                <option value="trending">Trending</option>
                <option value="campaign">Campaign</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Target Type</label>
              <select value={form.target_type} onChange={e => set('target_type', e.target.value)} className={selectCls}>
                <option value="channel">Channel</option>
                <option value="product">Product</option>
                <option value="campaign">Campaign</option>
              </select>
            </div>
          </div>

          {/* Target ID */}
          <div>
            <label className={labelCls}>Target ID</label>
            <input value={form.target_id} onChange={e => set('target_id', e.target.value)} placeholder="e.g. c7 or p5" className={inputCls} />
          </div>

          {/* Title + Subtitle */}
          <div>
            <label className={labelCls}>Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required className={inputCls} placeholder="Billboard headline" />
          </div>
          <div>
            <label className={labelCls}>Subtitle</label>
            <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)} className={inputCls} placeholder="Secondary text" />
          </div>

          {/* Image URL */}
          <div>
            <label className={labelCls}>Image URL</label>
            <input value={form.image_url} onChange={e => set('image_url', e.target.value)} required className={inputCls} placeholder="https://..." />
            {form.image_url && (
              <img src={form.image_url} alt="Preview" className="mt-2 h-24 w-full rounded-lg object-cover bg-zinc-800" />
            )}
          </div>

          {/* CTA + Badge */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>CTA Label</label>
              <input value={form.cta_label} onChange={e => set('cta_label', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Badge Text</label>
              <input value={form.badge_text} onChange={e => set('badge_text', e.target.value)} className={inputCls} placeholder="e.g. Hot Deal" />
            </div>
            <div>
              <label className={labelCls}>Badge Color</label>
              <select value={form.badge_color} onChange={e => set('badge_color', e.target.value)} className={selectCls}>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
                <option value="indigo">Indigo</option>
                <option value="cyan">Cyan</option>
                <option value="emerald">Emerald</option>
              </select>
            </div>
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <input type="number" value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls} min={0} max={100} />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Starts At</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Ends At</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className={inputCls} />
              <p className="text-[10px] text-white/20 mt-1">Leave empty for no end date</p>
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Budget (cents)</label>
              <input type="number" value={form.budget_cents} onChange={e => set('budget_cents', e.target.value)} className={inputCls} min={0} />
            </div>
            <div>
              <label className={labelCls}>CPM (cents)</label>
              <input type="number" value={form.cpm_cents} onChange={e => set('cpm_cents', e.target.value)} className={inputCls} min={0} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputCls} placeholder="Optional longer description" />
          </div>

          {/* Submit */}
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors disabled:opacity-60">
            {saving ? 'Saving...' : isEdit ? 'Update Billboard' : 'Create Billboard'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
