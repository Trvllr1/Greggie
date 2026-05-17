import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, ShieldCheck, Truck, Package, Loader2, CheckCircle2,
  MapPin, CreditCard, Plus, Clock, Zap, Mail, Lock,
  User, Eye, EyeOff, Tag, X,
} from 'lucide-react';
import type { LocalCartItem } from '../hooks/useCart';
import * as api from '../services/api';

/* ── Single-page Marketplace Checkout ─────────────────────
   All inputs stacked on one screen with a sticky total +
   Place Order CTA. Modeled on Facebook Marketplace's
   "one form, one tap" flow to remove drop-off between steps.
   ────────────────────────────────────────────────────────── */

type Props = {
  items: LocalCartItem[];
  total: number;
  onBack: () => void;
  onComplete: (order: { id: string; status: string; total_cents: number }) => void;
  onClearCart: () => void;
  userEmail?: string;
  isLoggedIn?: boolean;
  onSignIn?: () => void;
};

type ShippingForm = {
  full_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
};

type PaymentForm = {
  card_number: string;
  expiry: string;
  cvv: string;
  name_on_card: string;
};

const SHIPPING_METHODS = [
  { id: 'standard', label: 'Standard', desc: '5–7 days', cents: 599, icon: Truck },
  { id: 'express', label: 'Express', desc: '2–3 days', cents: 1299, icon: Clock },
  { id: 'overnight', label: 'Overnight', desc: 'Next day', cents: 2499, icon: Zap },
];

const emptyAddress: ShippingForm = {
  full_name: '', address_line1: '', address_line2: '',
  city: '', state: '', zip_code: '', phone: '',
};

const emptyPayment: PaymentForm = {
  card_number: '', expiry: '', cvv: '', name_on_card: '',
};

const INPUT =
  'w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors';

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}
function getCardBrand(num: string): string {
  const clean = num.replace(/\s/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'Amex';
  if (/^6(?:011|5)/.test(clean)) return 'Discover';
  return '';
}

export function MarketplaceCheckout({
  items, total, onBack, onComplete, onClearCart, userEmail, isLoggedIn, onSignIn,
}: Props) {
  const [email, setEmail] = useState(userEmail ?? '');
  const [address, setAddress] = useState<ShippingForm>(emptyAddress);
  const [showAddr2, setShowAddr2] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [payment, setPayment] = useState<PaymentForm>(emptyPayment);
  const [showCvv, setShowCvv] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<api.MarketplaceOrderResponse | null>(null);
  const [estimate, setEstimate] = useState<api.TaxEstimate | null>(null);

  // ── Billing address (defaults to same as shipping) ──
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState<ShippingForm>(emptyAddress);
  const [showBillingAddr2, setShowBillingAddr2] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<api.CouponResponse | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);

  // Live tax estimate — refetch whenever shipping/address/coupon changes.
  useEffect(() => {
    if (order) return;
    const hasZip = /^\d{5}/.test(address.zip_code.trim());
    if (!hasZip) return;
    const estItems = items.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));
    api
      .estimateTax(
        estItems,
        shippingMethod,
        {
          full_name: address.full_name,
          address_line1: address.address_line1,
          address_line2: address.address_line2,
          city: address.city,
          state: address.state,
          zip_code: address.zip_code,
          phone: address.phone,
        },
        coupon?.valid ? coupon.code : undefined,
      )
      .then(setEstimate)
      .catch(() => {});
  }, [shippingMethod, items, coupon, address, order]);

  const validate = (): boolean => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (
      !address.full_name.trim() ||
      !address.address_line1.trim() ||
      !address.city.trim() ||
      !address.state.trim() ||
      !address.zip_code.trim()
    ) {
      setError('Please fill in your shipping address.');
      return false;
    }
    if (!/^\d{5}(-\d{4})?$/.test(address.zip_code.trim())) {
      setError('Please enter a valid ZIP code.');
      return false;
    }
    const num = payment.card_number.replace(/\s/g, '');
    if (num.length < 13 || num.length > 19 || !/^\d+$/.test(num)) {
      setError('Please enter a valid card number.');
      return false;
    }
    if (!/^\d{2}\/\d{2}$/.test(payment.expiry)) {
      setError('Expiry must be MM/YY format.');
      return false;
    }
    const [mm, yy] = payment.expiry.split('/').map(Number);
    if (mm < 1 || mm > 12) {
      setError('Invalid expiry month.');
      return false;
    }
    const now = new Date();
    const expYear = 2000 + yy;
    if (expYear < now.getFullYear() || (expYear === now.getFullYear() && mm < now.getMonth() + 1)) {
      setError('Card has expired.');
      return false;
    }
    if (!/^\d{3,4}$/.test(payment.cvv)) {
      setError('CVV must be 3 or 4 digits.');
      return false;
    }
    if (!payment.name_on_card.trim()) {
      setError('Name on card is required.');
      return false;
    }
    if (!billingSame) {
      if (
        !billing.full_name.trim() ||
        !billing.address_line1.trim() ||
        !billing.city.trim() ||
        !billing.state.trim() ||
        !billing.zip_code.trim()
      ) {
        setError('Please fill in your billing address.');
        return false;
      }
      if (!/^\d{5}(-\d{4})?$/.test(billing.zip_code.trim())) {
        setError('Please enter a valid billing ZIP code.');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const subtotalCents = Math.round(total * 100);
      const res = await api.validateCoupon(couponInput.trim(), subtotalCents);
      setCoupon(res);
      if (!res.valid) setError(res.message || 'Invalid coupon code.');
      else setError(null);
    } catch {
      setError('Could not validate coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    setError(null);
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    setPlacing(true);
    setError(null);
    try {
      const trimAddr = (a: ShippingForm) => ({
        full_name: a.full_name.trim(),
        address_line1: a.address_line1.trim(),
        address_line2: a.address_line2.trim(),
        city: a.city.trim(),
        state: a.state.trim(),
        zip_code: a.zip_code.trim(),
        phone: a.phone.trim(),
      });
      const shippingTrimmed = trimAddr(address);
      const req: api.MarketplaceCheckoutRequest = {
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        shipping_address: shippingTrimmed,
        billing_address: billingSame ? shippingTrimmed : trimAddr(billing),
        shipping_method: shippingMethod,
        email: email.trim(),
        coupon_code: coupon?.valid ? coupon.code : undefined,
      };
      const result = await api.marketplaceCheckout(req);
      setOrder(result);
      onClearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const shippingInfo = SHIPPING_METHODS.find((m) => m.id === shippingMethod)!;
  const subtotalCents = estimate?.subtotal_cents ?? Math.round(total * 100);
  const shippingCents = estimate?.shipping_cents ?? shippingInfo.cents;
  const discountCents = estimate?.discount_cents ?? (coupon?.valid ? coupon.discount_cents : 0);
  const taxCents = estimate?.tax_cents ?? 0;
  const serviceFeeCents =
    estimate?.service_fee_cents ??
    Math.min(500, Math.round(Math.max(0, subtotalCents - discountCents) * 0.04));
  const totalCents =
    estimate?.total_cents ??
    (subtotalCents - discountCents + shippingCents + taxCents + serviceFeeCents);
  const taxLabel = estimate?.tax_source === 'stripe_tax' ? 'Tax' : 'Est. tax';
  const cardBrand = getCardBrand(payment.card_number);
  const maskedCard = payment.card_number.replace(/\s/g, '').slice(-4);

  /* ── Confirmation view ── */
  if (order) {
    const billingSummary = billingSame ? address : billing;
    const orderItems =
      (order.items && order.items.length > 0
        ? order.items.map((oi) => {
            const match = items.find((i) => i.product.id === oi.product_id);
            return {
              id: oi.id,
              name: match?.product.name ?? oi.product_id.slice(0, 8),
              quantity: oi.quantity,
              price_cents: oi.price_cents,
              mediaUrl: match?.product.mediaUrl,
            };
          })
        : items.map((i) => ({
            id: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            price_cents: Math.round(i.product.price * 100),
            mediaUrl: i.product.mediaUrl,
          }))) ?? [];

    const orderSubtotal = order.subtotal_cents ?? subtotalCents;
    const orderShipping = order.shipping_cents ?? shippingCents;
    const orderTax = order.tax_cents ?? taxCents;
    const orderDiscount = order.discount_cents ?? discountCents;
    const orderServiceFee = order.service_fee_cents ?? serviceFeeCents;
    const orderTotal = order.total_cents ?? totalCents;
    const shipMethodLabel =
      SHIPPING_METHODS.find((m) => m.id === (order.shipping_method ?? shippingMethod))?.label ??
      shippingInfo.label;

    return (
      <div
        className="fixed inset-0 z-40 flex flex-col overflow-hidden"
        style={{ backgroundColor: '#0A0A0F' }}
      >
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <h1 className="text-lg font-bold text-white">Order Confirmed</h1>
        </header>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-5 pt-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <CheckCircle2 size={40} className="text-green-400" />
          </motion.div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-white">Thank you, your order is placed</h2>
            <p className="text-sm text-white/50">A confirmation email is on its way to {email}.</p>
          </div>

          {/* Order details card */}
          <div className="w-full max-w-md rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Order ID</span>
              <span className="text-white font-mono text-xs">
                {(order.id ?? '').slice(0, 8).toUpperCase() || 'PENDING'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Status</span>
              <span className="text-white capitalize">{order.status ?? 'processing'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Delivery</span>
              <span className="text-white">{shipMethodLabel}</span>
            </div>
            <div className="border-t border-white/10 pt-3 space-y-2">
              {orderItems.map((oi) => (
                <div key={oi.id} className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded bg-white/10 overflow-hidden flex-shrink-0">
                    {oi.mediaUrl ? (
                      <img src={oi.mediaUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package size={12} className="text-white/20" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-white/80 truncate flex-1">{oi.name}</span>
                  <span className="text-xs text-white/40">×{oi.quantity}</span>
                  <span className="text-sm text-white/70 w-16 text-right">
                    ${((oi.price_cents * oi.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-y-1 text-xs">
              <span className="text-white/50">Subtotal</span>
              <span className="text-right text-white/80">
                ${(orderSubtotal / 100).toFixed(2)}
              </span>
              {orderDiscount > 0 && (
                <>
                  <span className="text-green-400">Discount</span>
                  <span className="text-right text-green-400">
                    −${(orderDiscount / 100).toFixed(2)}
                  </span>
                </>
              )}
              <span className="text-white/50">Shipping</span>
              <span className="text-right text-white/80">
                ${(orderShipping / 100).toFixed(2)}
              </span>
              <span className="text-white/50">Tax</span>
              <span className="text-right text-white/80">${(orderTax / 100).toFixed(2)}</span>
              {orderServiceFee > 0 && (
                <>
                  <span className="text-white/50">Service fee</span>
                  <span className="text-right text-white/80">
                    ${(orderServiceFee / 100).toFixed(2)}
                  </span>
                </>
              )}
              <span className="text-sm font-semibold text-white pt-1">Total</span>
              <span className="text-right text-sm font-semibold text-white pt-1">
                ${(orderTotal / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Addresses card */}
          <div className="w-full max-w-md rounded-xl bg-white/5 border border-white/10 p-4 grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-white/50 uppercase tracking-wider">Ship to</p>
              <p className="text-white">{address.full_name}</p>
              <p className="text-white/70">{address.address_line1}</p>
              {address.address_line2 && (
                <p className="text-white/70">{address.address_line2}</p>
              )}
              <p className="text-white/70">
                {address.city}, {address.state} {address.zip_code}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-white/50 uppercase tracking-wider">Bill to</p>
              <p className="text-white">{billingSummary.full_name || address.full_name}</p>
              <p className="text-white/70">
                {billingSummary.address_line1 || address.address_line1}
              </p>
              {(billingSummary.address_line2 || (billingSame && address.address_line2)) && (
                <p className="text-white/70">
                  {billingSummary.address_line2 || address.address_line2}
                </p>
              )}
              <p className="text-white/70">
                {billingSummary.city || address.city},{' '}
                {billingSummary.state || address.state}{' '}
                {billingSummary.zip_code || address.zip_code}
              </p>
            </div>
          </div>

          {!isLoggedIn && onSignIn && (
            <div className="w-full max-w-md rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-4 space-y-2">
              <p className="text-sm font-medium text-white">
                Save your info for faster checkout?
              </p>
              <button
                onClick={onSignIn}
                className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                Create Account
              </button>
            </div>
          )}
          <button
            onClick={() =>
              onComplete({
                id: order.id ?? '',
                status: order.status ?? 'processing',
                total_cents: orderTotal,
              })
            }
            className="w-full max-w-md rounded-xl py-3.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
          >
            Continue Shopping
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Main single-page form ── */
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col overflow-hidden"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white">Checkout</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs text-white/30">
          <Lock size={12} />
          <span>Secure</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl p-4 space-y-5 pb-8">
          {/* ── Cart preview ── */}
          <section className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-xs font-semibold text-white/50 uppercase mb-2">
              Your cart ({items.reduce((s, i) => s + i.quantity, 0)} item{items.length !== 1 ? 's' : ''})
            </p>
            <div className="space-y-2">
              {items.slice(0, 4).map((item) => (
                <div key={item.product.id} className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded bg-white/10 overflow-hidden flex-shrink-0">
                    {item.product.mediaUrl ? (
                      <img
                        src={item.product.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package size={12} className="text-white/20" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-white/80 truncate flex-1">
                    {item.product.name}
                  </span>
                  <span className="text-xs text-white/40">×{item.quantity}</span>
                  <span className="text-sm text-white/70 w-16 text-right">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              {items.length > 4 && (
                <p className="text-xs text-white/30">+{items.length - 4} more</p>
              )}
            </div>
          </section>

          {/* ── Contact ── */}
          {!(isLoggedIn && userEmail) && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Contact
              </h2>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="email"
                  placeholder="Email address *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${INPUT} pl-11`}
                />
              </div>
              {!isLoggedIn && onSignIn && (
                <p className="text-xs text-white/40">
                  Have an account?{' '}
                  <button
                    onClick={onSignIn}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Sign in
                  </button>{' '}
                  for faster checkout.
                </p>
              )}
            </section>
          )}

          {/* ── Shipping address ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Shipping address
            </h2>
            <input
              type="text"
              placeholder="Full name *"
              value={address.full_name}
              onChange={(e) => setAddress((p) => ({ ...p, full_name: e.target.value }))}
              className={INPUT}
            />
            <input
              type="text"
              placeholder="Street address *"
              value={address.address_line1}
              onChange={(e) => setAddress((p) => ({ ...p, address_line1: e.target.value }))}
              className={INPUT}
            />
            {showAddr2 ? (
              <input
                type="text"
                placeholder="Apt, Suite, Unit (optional)"
                value={address.address_line2}
                onChange={(e) => setAddress((p) => ({ ...p, address_line2: e.target.value }))}
                className={INPUT}
              />
            ) : (
              <button
                onClick={() => setShowAddr2(true)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <Plus size={12} /> Add apartment, suite, etc.
              </button>
            )}
            <div className="grid grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="City *"
                value={address.city}
                onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                className={`col-span-2 ${INPUT}`}
              />
              <input
                type="text"
                placeholder="State *"
                maxLength={2}
                value={address.state}
                onChange={(e) =>
                  setAddress((p) => ({ ...p, state: e.target.value.toUpperCase() }))
                }
                className={`col-span-1 ${INPUT}`}
              />
              <input
                type="text"
                placeholder="ZIP *"
                maxLength={10}
                value={address.zip_code}
                onChange={(e) => setAddress((p) => ({ ...p, zip_code: e.target.value }))}
                className={`col-span-2 ${INPUT}`}
              />
            </div>
            <input
              type="tel"
              placeholder="Phone (for delivery updates)"
              value={address.phone}
              onChange={(e) => setAddress((p) => ({ ...p, phone: e.target.value }))}
              className={INPUT}
            />
          </section>

          {/* ── Delivery method (inline radio) ── */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Delivery
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {SHIPPING_METHODS.map((m) => {
                const Icon = m.icon;
                const selected = shippingMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setShippingMethod(m.id)}
                    className={`flex flex-col items-start gap-1 rounded-xl p-3 border transition-all ${
                      selected
                        ? 'bg-indigo-500/10 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon
                      size={16}
                      className={selected ? 'text-indigo-400' : 'text-white/40'}
                    />
                    <span
                      className={`text-sm font-medium ${
                        selected ? 'text-white' : 'text-white/80'
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="text-[11px] text-white/40">{m.desc}</span>
                    <span
                      className={`text-xs font-semibold ${
                        selected ? 'text-indigo-300' : 'text-white/60'
                      }`}
                    >
                      ${(m.cents / 100).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Payment ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Payment
              </h2>
              {cardBrand && (
                <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  {cardBrand}
                </span>
              )}
            </div>
            <div className="relative">
              <CreditCard
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                placeholder="Card number *"
                value={payment.card_number}
                onChange={(e) =>
                  setPayment((p) => ({ ...p, card_number: formatCardNumber(e.target.value) }))
                }
                maxLength={23}
                className={`${INPUT} pl-11 font-mono tracking-wider`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="MM/YY *"
                value={payment.expiry}
                onChange={(e) =>
                  setPayment((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))
                }
                maxLength={5}
                className={`${INPUT} font-mono`}
              />
              <div className="relative">
                <input
                  type={showCvv ? 'text' : 'password'}
                  placeholder="CVV *"
                  value={payment.cvv}
                  onChange={(e) =>
                    setPayment((p) => ({
                      ...p,
                      cvv: e.target.value.replace(/\D/g, '').slice(0, 4),
                    }))
                  }
                  maxLength={4}
                  className={`${INPUT} font-mono pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowCvv(!showCvv)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                >
                  {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="relative">
              <User
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                placeholder="Name on card *"
                value={payment.name_on_card}
                onChange={(e) =>
                  setPayment((p) => ({ ...p, name_on_card: e.target.value }))
                }
                className={`${INPUT} pl-11`}
              />
            </div>
            {/* ── Billing address toggle ── */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <span className="relative inline-flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={billingSame}
                  onChange={(e) => setBillingSame(e.target.checked)}
                  className="peer sr-only"
                  aria-label="Billing address same as shipping"
                />
                <span className="w-4 h-4 rounded border border-white/30 bg-white/5 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors flex items-center justify-center">
                  {billingSame && <CheckCircle2 size={12} className="text-white" />}
                </span>
              </span>
              <span className="text-sm text-white/70">Billing address same as shipping</span>
            </label>
          </section>

          {/* ── Billing address (when different from shipping) ── */}
          {!billingSame && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Billing address
              </h2>
              <input
                type="text"
                placeholder="Full name *"
                value={billing.full_name}
                onChange={(e) => setBilling((p) => ({ ...p, full_name: e.target.value }))}
                className={INPUT}
              />
              <input
                type="text"
                placeholder="Street address *"
                value={billing.address_line1}
                onChange={(e) => setBilling((p) => ({ ...p, address_line1: e.target.value }))}
                className={INPUT}
              />
              {showBillingAddr2 ? (
                <input
                  type="text"
                  placeholder="Apt, Suite, Unit (optional)"
                  value={billing.address_line2}
                  onChange={(e) =>
                    setBilling((p) => ({ ...p, address_line2: e.target.value }))
                  }
                  className={INPUT}
                />
              ) : (
                <button
                  onClick={() => setShowBillingAddr2(true)}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <Plus size={12} /> Add apartment, suite, etc.
                </button>
              )}
              <div className="grid grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="City *"
                  value={billing.city}
                  onChange={(e) => setBilling((p) => ({ ...p, city: e.target.value }))}
                  className={`col-span-2 ${INPUT}`}
                />
                <input
                  type="text"
                  placeholder="State *"
                  maxLength={2}
                  value={billing.state}
                  onChange={(e) =>
                    setBilling((p) => ({ ...p, state: e.target.value.toUpperCase() }))
                  }
                  className={`col-span-1 ${INPUT}`}
                />
                <input
                  type="text"
                  placeholder="ZIP *"
                  maxLength={10}
                  value={billing.zip_code}
                  onChange={(e) => setBilling((p) => ({ ...p, zip_code: e.target.value }))}
                  className={`col-span-2 ${INPUT}`}
                />
              </div>
            </section>
          )}

          {/* ── Coupon ── */}
          <section className="rounded-xl bg-white/5 border border-white/10 p-3">
            {!showCoupon && !coupon?.valid ? (
              <button
                onClick={() => setShowCoupon(true)}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
              >
                <Tag size={14} /> Have a promo code?
              </button>
            ) : coupon?.valid ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-green-400" />
                  <span className="text-sm font-medium text-green-400">{coupon.code}</span>
                  <span className="text-xs text-white/40">— {coupon.description}</span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  className={`${INPUT} flex-1 text-xs`}
                  autoFocus
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 px-4 py-2 text-xs font-semibold text-white flex items-center gap-1"
                >
                  {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                </button>
              </div>
            )}
          </section>

          {/* ── Ship-to summary ── */}
          {address.zip_code && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <MapPin size={12} />
              <span>
                Ships to {address.city || '—'}, {address.state || '—'} {address.zip_code}
              </span>
            </div>
          )}

          {/* ── Trust signals ── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-2.5 border border-white/10">
              <ShieldCheck size={14} className="text-green-400" />
              <span className="text-xs text-white/50 text-center">Buyer Protection</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-2.5 border border-white/10">
              <Lock size={14} className="text-indigo-400" />
              <span className="text-xs text-white/50 text-center">256-bit SSL</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 p-2.5 border border-white/10">
              <CreditCard size={14} className="text-yellow-400" />
              <span className="text-xs text-white/50 text-center">PCI Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky total + Place Order ── */}
      <div className="border-t border-white/10 bg-[#0A0A0F]/95 backdrop-blur-md p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/50">
            <span>Subtotal</span>
            <span className="text-right text-white/80">
              ${(subtotalCents / 100).toFixed(2)}
            </span>
            {discountCents > 0 && (
              <>
                <span className="text-green-400">Discount</span>
                <span className="text-right text-green-400">
                  −${(discountCents / 100).toFixed(2)}
                </span>
              </>
            )}
            <span>Shipping</span>
            <span className="text-right text-white/80">
              ${(shippingCents / 100).toFixed(2)}
            </span>
            <span>{taxLabel}</span>
            <span className="text-right text-white/80">
              ${(taxCents / 100).toFixed(2)}
            </span>
            {serviceFeeCents > 0 && (
              <>
                <span>Service fee</span>
                <span className="text-right text-white/80">
                  ${(serviceFeeCents / 100).toFixed(2)}
                </span>
              </>
            )}
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Total</span>
            <span className="text-xl font-bold text-white">
              ${(totalCents / 100).toFixed(2)}
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handlePlaceOrder}
            disabled={placing}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 transition-colors flex items-center justify-center gap-2"
          >
            {placing ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Placing order…
              </>
            ) : (
              <>
                <Lock size={14} /> Place Order — ${(totalCents / 100).toFixed(2)}
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
