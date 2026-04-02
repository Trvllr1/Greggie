import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../data/mockData';
import { X, ShieldCheck, ChevronRight, Minus, Plus, Package } from 'lucide-react';
import { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ButterflyIcon } from './ButterflyIcon';
import * as api from '../services/api';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

type CheckoutModalProps = {
  product: Product;
  channelId: string;
  onClose: () => void;
  onComplete: (order: { id: string; status: string; total_cents: number }) => void;
  onAddToCart?: (product: Product, quantity: number) => void;
  onOpenCart?: () => void;
  cartCount?: number;
};

export function CheckoutModal({ product, channelId, onClose, onComplete, onAddToCart, onOpenCart, cartCount = 0 }: CheckoutModalProps) {
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT'>('DETAILS');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [butterflyHovered, setButterflyHovered] = useState(false);

  const handleBuyNow = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const order = await api.initCheckout(product.id, quantity, channelId);
      setOrderId(order.id);
      if (order.stripe_client_secret && stripePromise) {
        setClientSecret(order.stripe_client_secret);
        setStep('PAYMENT');
      } else {
        onComplete(order);
      }
    } catch {
      onComplete({ id: `demo-${Date.now()}`, status: 'confirmed', total_cents: Math.round(product.price * quantity * 100) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!onAddToCart) return;
    onAddToCart(product, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const elementsOptions = useMemo(() => clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: { colorPrimary: '#6366F1', borderRadius: '12px', colorBackground: '#1A1A2E' },
    },
  } : null, [clientSecret]);

  const hasFilled = cartCount > 0;

  return (
    <>
      {/* Greggie-themed backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[49]"
        style={{
          background: 'linear-gradient(135deg, #0F0A1A 0%, #1A1035 30%, #0D1B2A 60%, #0F0A1A 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #6366F1 1px, transparent 1px), radial-gradient(circle at 75% 75%, #6366F1 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 h-48 w-48 rounded-full bg-purple-600/8 blur-[100px] pointer-events-none" />
        {/* Butterfly emblem watermark */}
        <img
          src="/ButterflyEmblem.png"
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-md opacity-[0.06] pointer-events-none"
        />
      </motion.div>

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-w-lg mx-auto rounded-t-3xl overflow-hidden"
        style={{ backgroundColor: '#0F0F18' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Close + ButterflyIcon Cart */}
        <div className="flex items-center justify-between px-4 pb-2">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={18} />
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
            <ButterflyIcon size={18} hovered={butterflyHovered || hasFilled} />
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

        <AnimatePresence mode="wait">
          {step === 'DETAILS' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Content row: image + details side by side */}
              <div className="flex gap-4 px-4 pb-3">
                <div className="h-36 w-36 shrink-0 rounded-2xl bg-white/5 overflow-hidden">
                  {product.mediaUrl ? (
                    <img src={product.mediaUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package size={32} className="text-white/20" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between min-w-0 flex-1 py-1">
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight line-clamp-2">{product.name}</h2>
                    <p className="text-xl font-bold text-indigo-400 mt-1">${product.price.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-white/40 mt-2">
                    {product.saleType && (
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 capitalize">{product.saleType.replace('_', ' ')}</span>
                    )}
                    {product.inventory > 0 && (
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5">{product.inventory} left</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <p className="px-4 pb-3 text-sm text-white/50 leading-relaxed line-clamp-2">{product.description}</p>
              )}

              {error && <p className="text-center text-sm text-red-400 px-4 pb-2">{error}</p>}

              {/* Qty + Add to Cart row */}
              <div className="flex items-center gap-3 px-4 pb-3 pt-1">
                <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-2 py-1.5">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-0.5 rounded hover:bg-white/10 text-white/60"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.inventory || 99, quantity + 1))}
                    className="p-0.5 rounded hover:bg-white/10 text-white/60"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {onAddToCart && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddToCart}
                    disabled={product.inventory === 0 || addedToCart}
                    className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
                      addedToCart
                        ? 'bg-green-500 text-white'
                        : product.inventory === 0
                          ? 'bg-white/10 text-white/30 cursor-not-allowed'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600'
                    }`}
                  >
                    {addedToCart ? 'Added to Cart ✓' : product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </motion.button>
                )}
              </div>

              {/* Buy Now — for logged-in users with wallet/shipping ready */}
              <div className="px-4 pb-5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBuyNow}
                  disabled={isLoading || product.inventory === 0}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <span>{isLoading ? 'Processing...' : 'Buy Now'}</span>
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <span>${(product.price * quantity).toFixed(2)}</span>
                    <ChevronRight size={16} />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-4 pb-5 space-y-4"
            >
              {/* Order summary */}
              <div className="flex gap-4 rounded-2xl bg-white/5 p-4">
                <img src={product.mediaUrl} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-white line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-white/40">Qty: {quantity}</p>
                  </div>
                  <p className="text-lg font-bold text-white">${(product.price * quantity).toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-white/5 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-white/40">Subtotal</span>
                  <span className="font-medium text-white">${(product.price * quantity).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-white/40">Shipping</span>
                  <span className="font-medium text-green-400">Free</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-white">${(product.price * quantity).toFixed(2)}</span>
                </div>
              </div>

              {clientSecret && stripePromise && elementsOptions && (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <StripePaymentForm
                    orderId={orderId!}
                    totalCents={Math.round(product.price * quantity * 100)}
                    onComplete={onComplete}
                  />
                </Elements>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-white/40 pt-2">
                <ShieldCheck size={16} className="text-green-400" />
                Secure checkout powered by Stripe
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ── Stripe Payment Form (nested inside Elements) ──

function StripePaymentForm({
  orderId,
  totalCents,
  onComplete,
}: {
  orderId: string;
  totalCents: number;
  onComplete: (order: { id: string; status: string; total_cents: number }) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order_id=${orderId}`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed');
      setIsProcessing(false);
    } else {
      onComplete({ id: orderId, status: 'confirmed', total_cents: totalCents });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-lg font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        {isProcessing ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="h-6 w-6 rounded-full border-2 border-white border-t-transparent"
          />
        ) : (
          `Pay $${(totalCents / 100).toFixed(2)}`
        )}
      </button>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </form>
  );
}
