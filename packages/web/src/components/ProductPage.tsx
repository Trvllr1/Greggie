import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, Minus, Package, Star, Truck, Shield, RotateCcw,
  ChevronLeft, ChevronRight, Check, ThumbsUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { ButterflyIcon } from './ButterflyIcon';
import type { Product, ProductVariantGroup, ProductVariant } from '../data/mockData';

type Props = {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenCart: () => void;
  onViewProduct?: (product: Product) => void;
  cartCount: number;
};

/* ── Star ratings helper ─────────────────────────── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}
        />
      ))}
    </span>
  );
}

/* ── Image Gallery ───────────────────────────────── */
function ImageGallery({ images, mainImage, name }: { images?: string[]; mainImage: string; name: string }) {
  const allImages = useMemo(() => {
    const set = new Set<string>();
    if (mainImage) set.add(mainImage);
    images?.forEach(u => set.add(u));
    return Array.from(set);
  }, [images, mainImage]);

  const [idx, setIdx] = useState(0);
  const current = allImages[idx] || mainImage;

  return (
    <div className="space-y-2">
      <div className="relative aspect-square rounded-2xl bg-white/5 overflow-hidden group">
        <img src={current} alt={name} className="h-full w-full object-contain" />
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => setIdx((idx - 1 + allImages.length) % allImages.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setIdx((idx + 1) % allImages.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((url, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                i === idx ? 'border-indigo-400' : 'border-transparent hover:border-white/20'
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Variant Selector ────────────────────────────── */
function VariantSelector({
  groups,
  selected,
  onChange,
}: {
  groups: ProductVariantGroup[];
  selected: Record<string, string>;
  onChange: (groupId: string, optionId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {groups.map(g => (
        <div key={g.id}>
          <p className="text-xs font-semibold text-white/60 mb-1.5">
            {g.name}: <span className="text-white/80">{g.options.find(o => o.id === selected[g.id])?.label}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {g.options.map(opt => {
              const isColor = g.name.toLowerCase() === 'color' && opt.value?.startsWith('#');
              const active = selected[g.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onChange(g.id, opt.id)}
                  className={`relative rounded-lg border-2 transition-all ${
                    active ? 'border-indigo-400 ring-1 ring-indigo-400/30' : 'border-white/10 hover:border-white/30'
                  } ${isColor ? 'h-9 w-9' : 'px-3 py-1.5 text-xs font-medium text-white/80'}`}
                  style={isColor ? { backgroundColor: opt.value } : undefined}
                >
                  {isColor && active && (
                    <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow-md" />
                  )}
                  {!isColor && opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Review Card ─────────────────────────────────── */
function ReviewCard({ review }: { review: NonNullable<Product['reviews']>[number] }) {
  return (
    <div className="border-b border-white/5 py-3 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <Stars rating={review.rating} size={12} />
        <span className="text-xs font-semibold text-white/80">{review.title}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-white/40 mb-1.5">
        <span>{review.userName || 'Customer'}</span>
        {review.verifiedPurchase && (
          <span className="text-green-400 flex items-center gap-0.5"><Check size={10} /> Verified</span>
        )}
      </div>
      <p className="text-xs text-white/60 leading-relaxed">{review.body}</p>
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mt-2">
          {review.images.map((img, i) => (
            <img key={i} src={img} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ))}
        </div>
      )}
      <button className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/50 mt-1.5 transition-colors">
        <ThumbsUp size={10} /> Helpful ({review.helpfulCount})
      </button>
    </div>
  );
}

/* ── Main ProductPage ────────────────────────────── */
export function ProductPage({ product, onBack, onAddToCart, onOpenCart, onViewProduct, cartCount }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [butterflyHovered, setButterflyHovered] = useState(false);
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const hasFilled = cartCount > 0;

  // Variant selection state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    product.variantGroups?.forEach(g => {
      if (g.options.length > 0) init[g.id] = g.options[0].id;
    });
    return init;
  });

  // Find the matching variant for current selection
  const activeVariant = useMemo(() => {
    if (!product.variants?.length) return null;
    const selectedIds = Object.values(selectedOptions);
    return product.variants.find(v =>
      v.optionIds?.length === selectedIds.length &&
      selectedIds.every(id => v.optionIds.includes(id)),
    ) ?? product.variants.find(v => v.isDefault) ?? null;
  }, [product.variants, selectedOptions]);

  const effectivePrice = activeVariant?.price ?? product.price;
  const effectiveInventory = activeVariant?.inventory ?? product.inventory;
  const effectiveImage = activeVariant?.imageUrl ?? product.mediaUrl;

  // Collect all images for gallery
  const galleryImages = useMemo(() => {
    const imgs: string[] = [];
    if (product.images) {
      product.images.forEach(img => {
        if (typeof img === 'string') imgs.push(img);
      });
    }
    return imgs;
  }, [product.images]);

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleOptionChange = (groupId: string, optionId: string) => {
    setSelectedOptions(prev => ({ ...prev, [groupId]: optionId }));
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0F0A1A 0%, #1A1035 30%, #0D1B2A 60%, #0F0A1A 100%)',
      }}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, #6366F1 1px, transparent 1px), radial-gradient(circle at 75% 75%, #6366F1 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 h-48 w-48 rounded-full bg-purple-600/8 blur-[100px] pointer-events-none" />
      <img
        src="/ButterflyEmblem.png"
        alt=""
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-md opacity-[0.06] pointer-events-none"
      />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 py-3 z-10">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={onOpenCart}
          onMouseEnter={() => setButterflyHovered(true)}
          onMouseLeave={() => setButterflyHovered(false)}
          className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
          style={hasFilled ? {
            filter: `drop-shadow(0 0 12px rgba(251, 191, 36, 0.7)) drop-shadow(0 0 24px rgba(99, 102, 241, 0.4))`,
          } : undefined}
        >
          <ButterflyIcon size={20} hovered={butterflyHovered || hasFilled} />
          {hasFilled && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(16,185,129,0.6)]"
            >
              {cartCount}
            </motion.span>
          )}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="relative flex-1 overflow-y-auto z-10 pb-24">
        <div className="max-w-2xl mx-auto px-4 space-y-5">

          {/* ── Image Gallery ── */}
          <ImageGallery images={galleryImages} mainImage={effectiveImage} name={product.name} />

          {/* ── Title / Brand / Rating ── */}
          <div>
            {product.brand && (
              <p className="text-xs text-indigo-400 font-medium mb-0.5">{product.brand}</p>
            )}
            <h1 className="text-lg font-bold text-white leading-tight">{product.name}</h1>
            {(product.reviewCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={product.reviewAvg ?? 0} size={13} />
                <span className="text-xs text-amber-400 font-medium">{(product.reviewAvg ?? 0).toFixed(1)}</span>
                <span className="text-xs text-white/40">({product.reviewCount} reviews)</span>
              </div>
            )}
          </div>

          {/* ── Price ── */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">${effectivePrice.toFixed(2)}</span>
            {product.saleType === 'buy_now' && product.price !== effectivePrice && (
              <span className="text-sm text-white/40 line-through">${product.price.toFixed(2)}</span>
            )}
            {product.condition && product.condition !== 'new' && (
              <span className="text-xs rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 capitalize">
                {product.condition.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* ── Variant Selectors ── */}
          {product.variantGroups && product.variantGroups.length > 0 && (
            <VariantSelector
              groups={product.variantGroups}
              selected={selectedOptions}
              onChange={handleOptionChange}
            />
          )}

          {/* ── Bullet Points ── */}
          {product.bulletPoints && product.bulletPoints.length > 0 && (
            <div className="rounded-xl bg-white/5 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-white/60 mb-1">About this item</p>
              {product.bulletPoints.map((bp, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/70">
                  <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                  <span>{bp}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Shipping Info ── */}
          {product.shipping && (
            <div className="rounded-xl bg-white/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-green-400" />
                {product.shipping.freeShipping ? (
                  <span className="text-xs font-semibold text-green-400">FREE Shipping</span>
                ) : (
                  <span className="text-xs text-white/60">
                    Shipping: ${((product.shipping.flatRateCents ?? 0) / 100).toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/40">
                Estimated delivery: {product.shipping.estimatedDaysMin}–{product.shipping.estimatedDaysMax} business days
                {product.shipping.shipsFromState
                  ? ` from ${product.shipping.shipsFromState}, ${product.shipping.shipsFromCountry}`
                  : ` from ${product.shipping.shipsFromCountry}`}
              </p>
            </div>
          )}

          {/* ── Return / Warranty badges ── */}
          {(product.returnDays || product.warrantyInfo) && (
            <div className="flex gap-3">
              {product.returnDays && product.returnDays > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
                  <RotateCcw size={12} className="text-indigo-400" />
                  <span>{product.returnDays}-day returns</span>
                </div>
              )}
              {product.warrantyInfo && (
                <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
                  <Shield size={12} className="text-indigo-400" />
                  <span>{product.warrantyInfo}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Description (collapsible) ── */}
          {product.description && (
            <div>
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white/80 transition-colors"
              >
                Description {descExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <AnimatePresence>
                {descExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-white/50 leading-relaxed mt-2 whitespace-pre-line">{product.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Specs Table (collapsible) ── */}
          {product.specs && product.specs.length > 0 && (
            <div>
              <button
                onClick={() => setSpecsExpanded(!specsExpanded)}
                className="flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white/80 transition-colors"
              >
                Technical Details {specsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <AnimatePresence>
                {specsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 rounded-xl bg-white/5 overflow-hidden divide-y divide-white/5">
                      {product.specs.map((spec, i) => (
                        <div key={i} className="flex text-xs">
                          <span className="w-1/3 px-3 py-2 text-white/50 bg-white/[0.02] font-medium">{spec.key}</span>
                          <span className="flex-1 px-3 py-2 text-white/70">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Reviews Section ── */}
          {product.reviews && product.reviews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white/80">Customer Reviews</h3>
                <div className="flex items-center gap-1">
                  <Stars rating={product.reviewAvg ?? 0} size={11} />
                  <span className="text-[11px] text-white/40">{product.reviewCount} total</span>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                {product.reviews.map(r => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </div>
          )}

          {/* ── Bundle Offers ── */}
          {product.bundles && product.bundles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-2">Frequently Bought Together</h3>
              {product.bundles.map(bundle => (
                <div key={bundle.id} className="rounded-xl bg-white/5 p-3 mb-2 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-white/70">{bundle.name}</span>
                    {bundle.discountPct > 0 && (
                      <span className="text-[10px] rounded-full bg-green-500/20 text-green-400 px-2 py-0.5 font-bold">
                        Save {bundle.discountPct}%
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {bundle.items.map((item, i) => item.product && (
                      <div
                        key={i}
                        className="shrink-0 w-20 text-center cursor-pointer"
                        onClick={() => onViewProduct?.(item.product!)}
                      >
                        <div className="h-16 w-16 mx-auto rounded-lg bg-white/5 overflow-hidden">
                          <img src={item.product.mediaUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                        <p className="text-[10px] text-white/50 mt-1 line-clamp-1">{item.product.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Related Products ── */}
          {product.relatedProducts && product.relatedProducts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-2">Related Products</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.relatedProducts.map(related => (
                  <motion.div
                    key={related.id}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => onViewProduct?.(related)}
                    className="shrink-0 w-32 cursor-pointer rounded-xl bg-white/5 overflow-hidden"
                  >
                    <div className="h-28 bg-white/[0.02]">
                      <img src={related.mediaUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] text-white/70 line-clamp-2 leading-tight">{related.name}</p>
                      <p className="text-xs font-bold text-white mt-0.5">${related.price.toFixed(2)}</p>
                      {(related.reviewCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Stars rating={related.reviewAvg ?? 0} size={9} />
                          <span className="text-[9px] text-white/30">({related.reviewCount})</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory + Tags */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-white/40 pb-4">
            {product.saleType && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 capitalize">{product.saleType.replace('_', ' ')}</span>
            )}
            {effectiveInventory > 0 && effectiveInventory <= 10 && (
              <span className="rounded-full bg-red-500/20 text-red-400 px-2.5 py-0.5 font-medium">
                Only {effectiveInventory} left
              </span>
            )}
            {product.category && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5">{product.category}</span>
            )}
            {product.tags?.map(t => (
              <span key={t} className="rounded-full bg-white/10 px-2.5 py-0.5">#{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 px-4 py-3"
        style={{ backgroundColor: 'rgba(15,15,24,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {/* Quantity selector */}
          <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-2 py-1.5">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-0.5 rounded hover:bg-white/10 text-white/60"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm font-medium text-white">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(effectiveInventory || 99, quantity + 1))}
              className="p-0.5 rounded hover:bg-white/10 text-white/60"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to Cart */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            disabled={effectiveInventory === 0}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
              added
                ? 'bg-green-500 text-white'
                : effectiveInventory === 0
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
            }`}
          >
            {added ? 'Added ✓' : effectiveInventory === 0 ? 'Out of Stock' : `Add to Cart — $${(effectivePrice * quantity).toFixed(2)}`}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
