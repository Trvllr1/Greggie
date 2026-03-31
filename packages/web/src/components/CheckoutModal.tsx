import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../data/mockData';
import { X, ShieldCheck, Star, ChevronRight, Truck, RotateCcw } from 'lucide-react';
import { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import * as api from '../services/api';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

type CheckoutModalProps = {
  product: Product;
  channelId: string;
  onClose: () => void;
  onComplete: (order: { id: string; status: string; total_cents: number }) => void;
};

export function CheckoutModal({ product, channelId, onClose, onComplete }: CheckoutModalProps) {
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT'>('DETAILS');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyNow = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const order = await api.initCheckout(product.id, 1, channelId);
      setOrderId(order.id);
      if (order.stripe_client_secret && stripePromise) {
        setClientSecret(order.stripe_client_secret);
        setStep('PAYMENT');
      } else {
        // Stripe not configured (dev mode) — complete immediately
        onComplete(order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const elementsOptions = useMemo(() => clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: { colorPrimary: '#4f46e5', borderRadius: '12px' },
    },
  } : null, [clientSecret]);

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
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          {step === 'DETAILS' ? 'Product Details' : 'Checkout'}
        </h2>
        <button
          onClick={onClose}
          className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait">
          {step === 'DETAILS' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
                <img 
                  src={product.mediaUrl} 
                  alt={product.name} 
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-900 backdrop-blur-sm shadow-sm">
                  {product.inventory > 0 ? `${product.inventory} left in stock` : 'Out of stock'}
                </div>
              </div>

              <div>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h3>
                  <p className="text-2xl font-bold text-indigo-600">${product.price.toFixed(2)}</p>
                </div>
                
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center text-yellow-400">
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} className="text-gray-300" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">4.2 (128 reviews)</span>
                </div>
              </div>

              <div className="prose prose-sm text-gray-600">
                <p>{product.description}</p>
                <p className="mt-2">Experience the next generation of quality and performance. Designed with premium materials for everyday use.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-50 p-2 text-green-600">
                    <Truck size={20} />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">Free Shipping</p>
                    <p className="text-gray-500">2-3 business days</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                    <RotateCcw size={20} />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">Free Returns</p>
                    <p className="text-gray-500">Within 30 days</p>
                  </div>
                </div>
              </div>

              {error && <p className="text-center text-sm text-red-500">{error}</p>}
            </motion.div>
          ) : (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <img src={product.mediaUrl} alt={product.name} className="h-20 w-20 rounded-xl object-cover shadow-sm" />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-gray-500">Qty: 1</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-900">${product.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
                </div>
              </div>

              {/* Stripe Payment Element */}
              {clientSecret && stripePromise && elementsOptions && (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <StripePaymentForm
                    orderId={orderId!}
                    totalCents={Math.round(product.price * 100)}
                    onComplete={onComplete}
                  />
                </Elements>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-2">
                <ShieldCheck size={16} className="text-green-500" />
                Secure checkout powered by Stripe
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Action Bar for Details Step */}
      <AnimatePresence>
        {step === 'DETAILS' && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="flex-shrink-0 border-t border-gray-100 bg-white p-6"
          >
            <button
              onClick={handleBuyNow}
              disabled={isLoading}
              className="flex w-full items-center justify-between rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-200 transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              <span>{isLoading ? 'Processing...' : 'Buy Now'}</span>
              <div className="flex items-center gap-2">
                <span>${product.price.toFixed(2)}</span>
                <ChevronRight size={20} />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
