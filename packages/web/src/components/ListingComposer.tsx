import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Camera, MapPin, DollarSign, Tag, Loader2 } from 'lucide-react';
import * as api from '../services/api';
import type { Product } from '../data/mockData';

/* ── ListingComposer ──────────────────────────────────────
   Facebook-Marketplace-style listing flow. Above-the-fold:
     photo upload • title • price • category • ZIP
   Collapsed "More details": description • condition • brand.
   No shop or program setup required — the backend auto-creates
   both on first publish via /shop/products.
   ────────────────────────────────────────────────────────── */

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Garden', 'Beauty', 'Sports',
  'Toys & Games', 'Collectibles', 'Vehicles', 'Books', 'Other',
];

type Props = {
  onClose: () => void;
  onPublished: (product: Product) => void;
};

// Stable client-side entity id for presign (storage key only, no FK).
function tempEntityId() {
  // crypto.randomUUID is available in all evergreen browsers; fallback for older.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'tmp-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ListingComposer({ onClose, onPublished }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [category, setCategory] = useState('');
  const [zip, setZip] = useState('');

  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('new');
  const [brand, setBrand] = useState('');
  const [inventory, setInventory] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceCents = Math.round(parseFloat(priceDollars || '0') * 100);
  const canPublish =
    !!title.trim() && priceCents > 0 && !!photoUrl && !uploading && !submitting;

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError('Photo must be an image (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Photo must be under 8MB.');
      return;
    }
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await api.uploadFile(file, 'product', tempEntityId());
      setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
      setPhotoUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!canPublish) return;
    setSubmitting(true);
    setError(null);
    try {
      const product = await api.createShopProduct({
        name: title.trim(),
        description: description.trim(),
        image_url: photoUrl,
        price_cents: priceCents,
        inventory: Math.max(1, inventory),
        sale_type: 'buy_now',
        condition,
        brand: brand.trim(),
        category: category || undefined,
        location_zip: zip.trim() || undefined,
      });
      onPublished(product);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#11131B] p-6 text-white shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">List something</h3>
            <p className="text-xs text-white/40">Snap a photo, name your price.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Photo */}
        <div
          onClick={handlePickFile}
          className="relative mb-4 flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] transition-colors hover:border-indigo-500/40 hover:bg-white/[0.06]"
        >
          {photoPreview ? (
            <>
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="animate-spin text-white" size={32} />
                </div>
              )}
              {!uploading && photoUrl && (
                <div className="absolute bottom-2 right-2 rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                  Ready
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/40">
              <Camera size={36} />
              <span className="text-sm font-medium">Add a photo</span>
              <span className="text-xs">Tap to choose</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you selling?"
          maxLength={100}
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50"
        />

        {/* Price + ZIP */}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="relative">
            <DollarSign
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="Price"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="relative">
            <MapPin
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP"
              maxLength={10}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Category */}
        <div className="relative mb-4">
          <Tag
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-500/50"
          >
            <option value="">Category (optional)</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* More details (collapsed) */}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="mb-3 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
        >
          {showMore ? '− Hide details' : '+ More details'}
        </button>

        {showMore && (
          <div className="mb-4 space-y-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-indigo-500/50"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-indigo-500/50"
                style={{ colorScheme: 'dark' }}
              >
                <option value="new" className="bg-[#1a1a24] text-white">New</option>
                <option value="like_new" className="bg-[#1a1a24] text-white">Like new</option>
                <option value="used_excellent" className="bg-[#1a1a24] text-white">Used – excellent</option>
                <option value="used_good" className="bg-[#1a1a24] text-white">Used – good</option>
                <option value="used_fair" className="bg-[#1a1a24] text-white">Used – fair</option>
                <option value="for_parts" className="bg-[#1a1a24] text-white">For parts / not working</option>
              </select>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Brand"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-indigo-500/50"
              />
            </div>
            <input
              type="number"
              min="1"
              value={inventory}
              onChange={(e) => setInventory(Number(e.target.value) || 1)}
              placeholder="Inventory"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-indigo-500/50"
            />
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={!canPublish}
            className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
          >
            {submitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
