import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ShieldCheck, Truck, Package, Loader2, CheckCircle2,
  MapPin, CreditCard, ChevronRight, Plus, Clock, Zap, Mail, Lock,
  User, Eye, EyeOff, Tag, X
} from 'lucide-react';
import type { LocalCartItem } from '../hooks/useCart';
import * as api from '../services/api';

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

type Step = 'contact' | 'shipping' | 'method' | 'payment' | 'review' | 'confirmation';

const CHECKOUT_STEPS: { key: Step; label: string }[] = [
  { key: 'contact', label: 'Contact' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'method', label: 'Delivery' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
];

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
  { id: 'standard', label: 'Standard Shipping', desc: '5–7 business days', cents: 599, icon: Truck },
  { id: 'express', label: 'Express Shipping', desc: '2–3 business days', cents: 1299, icon: Clock },
  { id: 'overnight', label: 'Overnight Shipping', desc: 'Next business day', cents: 2499, icon: Zap },
];

const emptyAddress: ShippingForm = {
  full_name: '', address_line1: '', address_line2: '',
  city: '', state: '', zip_code: '', phone: '',
};

const emptyPayment: PaymentForm = {
  card_number: '', expiry: '', cvv: '', name_on_card: '',
};

const INPUT_CLASSES = 'w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors';

export function MarketplaceCheckout({
  items, total, onBack, onComplete, onClearCart, userEmail, isLoggedIn, onSignIn,
}: Props) {
  // If user is logged in and we have their email, skip contact step
  const initialStep: Step = isLoggedIn && userEmail ? 'shipping' : 'contact';

  const [step, setStep] = useState<Step>(initialStep);
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

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<api.CouponResponse | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);

  // Fetch tax estimate when reaching review or method step
  useEffect(() => {
    if (step === 'review' || step === 'method' || step === 'payment') {
      const estItems = items.map(i => ({ product_id: i.product.id, quantity: i.quantity }));
      api.estimateTax(estItems, shippingMethod, {
        full_name: address.full_name,
        address_line1: address.address_line1,
        address_line2: address.address_line2,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code,
        phone: address.phone,
      }, coupon?.valid ? coupon.code : undefined)
        .then(setEstimate)
        .catch(() => {});
    }
  }, [step, shippingMethod, items, coupon, address]);

  const stepIndex = CHECKOUT_STEPS.findIndex(s => s.key === step);

  // ── Validation ──
  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('Email is required for order updates.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateShipping = (): boolean => {
    if (!address.full_name.trim() || !address.address_line1.trim() ||
        !address.city.trim() || !address.state.trim() || !address.zip_code.trim()) {
      setError('Please fill in all required shipping fields.');
      return false;
    }
    if (!/^\d{5}(-\d{4})?$/.test(address.zip_code.trim())) {
      setError('Please enter a valid ZIP code.');
      return false;
    }
    setError(null);
    return true;
  };

  const validatePayment = (): boolean => {
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
    const expMonth = mm;
    if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
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
    setError(null);
    return true;
  };

  // ── Navigation ──
  const goTo = (target: Step) => { setError(null); setStep(target); };

  const handleNextFromContact = () => { if (validateEmail()) goTo('shipping'); };
  const handleNextFromShipping = () => { if (validateShipping()) goTo('method'); };
  const handleNextFromMethod = () => { goTo('payment'); };
  const handleNextFromPayment = () => { if (validatePayment()) goTo('review'); };

  // ── Coupon ──
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const subtotalCents = Math.round(total * 100);
      const res = await api.validateCoupon(couponInput.trim(), subtotalCents);
      setCoupon(res);
      if (!res.valid) {
        setError(res.message || 'Invalid coupon code.');
      } else {
        setError(null);
      }
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

  const prevStep = (): Step => {
    switch (step) {
      case 'shipping': return isLoggedIn && userEmail ? 'shipping' : 'contact';
      case 'method': return 'shipping';
      case 'payment': return 'method';
      case 'review': return 'payment';
      default: return 'contact';
    }
  };

  // ── Place order ──
  const handlePlaceOrder = async () => {
    setPlacing(true);
    setError(null);
    try {
      const req: api.MarketplaceCheckoutRequest = {
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        shipping_address: {
          full_name: address.full_name.trim(),
          address_line1: address.address_line1.trim(),
          address_line2: address.address_line2.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          zip_code: address.zip_code.trim(),
          phone: address.phone.trim(),
        },
        shipping_method: shippingMethod,
        email: email.trim(),
        coupon_code: coupon?.valid ? coupon.code : undefined,
      };
      const result = await api.marketplaceCheckout(req);
      setOrder(result);
      onClearCart();
      goTo('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Card formatting helpers ──
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const getCardBrand = (num: string): string => {
    const clean = num.replace(/\s/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'Amex';
    if (/^6(?:011|5)/.test(clean)) return 'Discover';
    return '';
  };

  // ── Computed values ──
  const shippingInfo = SHIPPING_METHODS.find(m => m.id === shippingMethod)!;
  const subtotalCents = estimate?.subtotal_cents ?? Math.round(total * 100);
  const shippingCents = estimate?.shipping_cents ?? shippingInfo.cents;
  const discountCents = estimate?.discount_cents ?? (coupon?.valid ? coupon.discount_cents : 0);
  const taxCents = estimate?.tax_cents ?? 0;
  const totalCents = estimate?.total_cents ?? (subtotalCents - discountCents + shippingCents + taxCents);
  const taxLabel = estimate?.tax_source === 'stripe_tax' ? 'Tax (Stripe Tax)' : 'Estimated tax';
  const cardBrand = getCardBrand(payment.card_number);
  const maskedCard = payment.card_number.replace(/\s/g, '').slice(-4);

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ backgroundColor: '#0A0A0F' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={step === initialStep ? onBack : () => goTo(prevStep())}
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

      {/* Progress Bar */}
      {step !== 'confirmation' && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-1">
            {CHECKOUT_STEPS.map((s, i) => (
              <div key={s.key} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-indigo-500' : 'bg-white/10'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {CHECKOUT_STEPS.map((s, i) => (
              <span key={s.key} className={`text-xs font-medium ${
                i <= stepIndex ? 'text-indigo-400' : 'text-white/30'
              }`}>{s.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ─── Step 1: Contact Info ─── */}
          {step === 'contact' && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-5"
            >
              <div>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Contact Information</h2>
                <p className="text-xs text-white/30 mt-1">We'll send order confirmation and shipping updates to this email.</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    placeholder="Email address *"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`${INPUT_CLASSES} pl-11`}
                    autoFocus
                  />
                </div>
              </div>

              {!isLoggedIn && onSignIn && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-white/50">
                    Already have an account?{' '}
                    <button onClick={onSignIn} className="text-indigo-400 hover:text-indigo-300 font-medium">
                      Gregg in
                    </button>
                    {' '}for faster checkout.
                  </p>
                </div>
              )}

              {/* Cart summary */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-xs font-semibold text-white/50 uppercase mb-2">Your Cart ({items.reduce((s, i) => s + i.quantity, 0)} items)</p>
                <div className="space-y-2">
                  {items.slice(0, 3).map(item => (
                    <div key={item.product.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-white/10 overflow-hidden flex-shrink-0">
                        {item.product.mediaUrl ? (
                          <img src={item.product.mediaUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><Package size={12} className="text-white/20" /></div>
                        )}
                      </div>
                      <span className="text-xs text-white/60 truncate flex-1">{item.product.name}</span>
                      <span className="text-xs text-white/40">×{item.quantity}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-white/30">+{items.length - 3} more item{items.length - 3 > 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-sm">
                  <span className="text-white/50">Subtotal</span>
                  <span className="text-white font-medium">${total.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Shipping Address ─── */}
          {step === 'shipping' && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Shipping Address</h2>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={address.full_name}
                  onChange={e => setAddress(p => ({ ...p, full_name: e.target.value }))}
                  className={INPUT_CLASSES}
                  autoFocus
                />

                <input
                  type="text"
                  placeholder="Street Address *"
                  value={address.address_line1}
                  onChange={e => setAddress(p => ({ ...p, address_line1: e.target.value }))}
                  className={INPUT_CLASSES}
                />

                {showAddr2 ? (
                  <input
                    type="text"
                    placeholder="Apt, Suite, Unit (optional)"
                    value={address.address_line2}
                    onChange={e => setAddress(p => ({ ...p, address_line2: e.target.value }))}
                    className={INPUT_CLASSES}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddr2(true)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Plus size={12} /> Add apartment, suite, etc.
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder="City *"
                    value={address.city}
                    onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                    className={`col-span-2 ${INPUT_CLASSES}`}
                  />
                  <input
                    type="text"
                    placeholder="State *"
                    maxLength={2}
                    value={address.state}
                    onChange={e => setAddress(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                    className={`col-span-1 ${INPUT_CLASSES}`}
                  />
                  <input
                    type="text"
                    placeholder="ZIP *"
                    maxLength={10}
                    value={address.zip_code}
                    onChange={e => setAddress(p => ({ ...p, zip_code: e.target.value }))}
                    className={`col-span-2 ${INPUT_CLASSES}`}
                  />
                </div>

                <input
                  type="tel"
                  placeholder="Phone (for delivery updates)"
                  value={address.phone}
                  onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))}
                  className={INPUT_CLASSES}
                />
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Shipping Method ─── */}
          {step === 'method' && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Delivery Method</h2>

              <div className="space-y-3">
                {SHIPPING_METHODS.map(method => {
                  const Icon = method.icon;
                  const isSelected = shippingMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setShippingMethod(method.id)}
                      className={`w-full flex items-center gap-3 rounded-xl p-4 border transition-all ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-indigo-500/20' : 'bg-white/5'
                      }`}>
                        <Icon size={20} className={isSelected ? 'text-indigo-400' : 'text-white/40'} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/80'}`}>
                          {method.label}
                        </p>
                        <p className="text-xs text-white/40">{method.desc}</p>
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-400' : 'text-white/60'}`}>
                        ${(method.cents / 100).toFixed(2)}
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-indigo-500' : 'border-white/20'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Ship to summary */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <MapPin size={12} />
                  <span>{address.full_name} — {address.address_line1}, {address.city}, {address.state} {address.zip_code}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 4: Payment Method ─── */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-5"
            >
              <div>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Payment Method</h2>
                <p className="text-xs text-white/30 mt-1">All transactions are secure and encrypted.</p>
              </div>

              {/* Card form */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-indigo-400" />
                    <span className="text-sm font-medium text-white">Credit / Debit Card</span>
                  </div>
                  {cardBrand && (
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {cardBrand}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Card Number *"
                      value={payment.card_number}
                      onChange={e => setPayment(p => ({ ...p, card_number: formatCardNumber(e.target.value) }))}
                      maxLength={23}
                      className={`${INPUT_CLASSES} pl-11 font-mono tracking-wider`}
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="MM/YY *"
                      value={payment.expiry}
                      onChange={e => setPayment(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                      maxLength={5}
                      className={`${INPUT_CLASSES} font-mono`}
                    />
                    <div className="relative">
                      <input
                        type={showCvv ? 'text' : 'password'}
                        placeholder="CVV *"
                        value={payment.cvv}
                        onChange={e => setPayment(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        maxLength={4}
                        className={`${INPUT_CLASSES} font-mono pr-10`}
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
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Name on Card *"
                      value={payment.name_on_card}
                      onChange={e => setPayment(p => ({ ...p, name_on_card: e.target.value }))}
                      className={`${INPUT_CLASSES} pl-11`}
                    />
                  </div>
                </div>
              </div>

              {/* Billing address note */}
              <div className="flex items-center gap-2 text-xs text-white/40">
                <ShieldCheck size={14} className="text-green-400 flex-shrink-0" />
                <span>Billing address is the same as shipping address.</span>
              </div>

              {/* Trust signals */}
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
            </motion.div>
          )}

          {/* ─── Step 5: Review & Place Order ─── */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-4"
            >
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Review Your Order</h2>

              {/* Contact */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/50 uppercase">Contact</span>
                  <button onClick={() => goTo('contact')} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-white/30" />
                  <p className="text-sm text-white">{email}</p>
                </div>
              </div>

              {/* Ship to */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/50 uppercase">Ship to</span>
                  <button onClick={() => goTo('shipping')} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                </div>
                <p className="text-sm text-white">{address.full_name}</p>
                <p className="text-xs text-white/50">
                  {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}
                </p>
                <p className="text-xs text-white/50">{address.city}, {address.state} {address.zip_code}</p>
              </div>

              {/* Shipping method */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/50 uppercase">Delivery</span>
                  <button onClick={() => goTo('method')} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                </div>
                <p className="text-sm text-white mt-1">{shippingInfo.label} — {shippingInfo.desc}</p>
              </div>

              {/* Payment */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/50 uppercase">Payment</span>
                  <button onClick={() => goTo('payment')} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <CreditCard size={14} className="text-indigo-400" />
                  <p className="text-sm text-white">
                    {cardBrand ? `${cardBrand} ` : ''}ending in {maskedCard}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase">Items ({items.reduce((s, i) => s + i.quantity, 0)})</p>
                {items.map(item => (
                  <div key={item.product.id} className="flex gap-3 rounded-xl bg-white/5 p-3 border border-white/10">
                    <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-white/10 overflow-hidden">
                      {item.product.mediaUrl ? (
                        <img src={item.product.mediaUrl} alt={item.product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package size={16} className="text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                      <p className="text-xs text-white/40">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-white self-center">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Coupon code */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                {!showCoupon && !coupon?.valid ? (
                  <button
                    onClick={() => setShowCoupon(true)}
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
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
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
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
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      className={`${INPUT_CLASSES} flex-1 text-xs`}
                      autoFocus
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 px-4 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-1"
                    >
                      {couponLoading ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Subtotal</span>
                  <span className="text-white">${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400 flex items-center gap-1"><Tag size={12} /> Discount</span>
                    <span className="text-green-400">-${(discountCents / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Shipping</span>
                  <span className="text-white">${(shippingCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{taxLabel}</span>
                  <span className="text-white">${(taxCents / 100).toFixed(2)}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-white">${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 6: Confirmation ─── */}
          {step === 'confirmation' && order && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="p-4 space-y-6 flex flex-col items-center pt-10"
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
                <h2 className="text-xl font-bold text-white">Order Confirmed!</h2>
                <p className="text-sm text-white/50">Thank you for your purchase</p>
              </div>

              <div className="w-full rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Order ID</span>
                  <span className="text-white font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Total Paid</span>
                  <span className="text-white font-semibold">${(order.total_cents / 100).toFixed(2)}</span>
                </div>
                {discountCents > 0 && coupon?.valid && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400 flex items-center gap-1"><Tag size={12} /> Discount ({coupon.code})</span>
                    <span className="text-green-400">-${(discountCents / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Delivery</span>
                  <span className="text-white">{shippingInfo.label} — {shippingInfo.desc}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Ship to</span>
                  <span className="text-white text-right text-xs">{address.full_name}<br/>{address.city}, {address.state}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Payment</span>
                  <span className="text-white text-xs">{cardBrand} ····{maskedCard}</span>
                </div>
              </div>

              <p className="text-xs text-white/40 text-center">
                A confirmation email will be sent to <span className="text-white/60">{email}</span>
              </p>

              {/* Create account CTA for guests */}
              {!isLoggedIn && (
                <div className="w-full rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-4 space-y-2">
                  <p className="text-sm font-medium text-white">Save your info for faster checkout?</p>
                  <p className="text-xs text-white/50">Create a Greggie account to track orders, manage addresses, and check out in one tap next time.</p>
                  {onSignIn && (
                    <button
                      onClick={onSignIn}
                      className="mt-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
                    >
                      Create Account
                    </button>
                  )}
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onComplete({ id: order.id, status: order.status, total_cents: order.total_cents })}
                className="w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
              >
                Continue Shopping
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer (step-specific action buttons) */}
      {step !== 'confirmation' && (
        <div className="border-t border-white/10 p-4 space-y-3">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {step === 'contact' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNextFromContact}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              Continue to Shipping <ChevronRight size={16} />
            </motion.button>
          )}

          {step === 'shipping' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNextFromShipping}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              Continue to Delivery <ChevronRight size={16} />
            </motion.button>
          )}

          {step === 'method' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Subtotal + Shipping</span>
                <span className="text-white font-semibold">
                  ${((subtotalCents + shippingCents) / 100).toFixed(2)}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleNextFromMethod}
                className="w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Payment <ChevronRight size={16} />
              </motion.button>
            </div>
          )}

          {step === 'payment' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNextFromPayment}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              Review Order <ChevronRight size={16} />
            </motion.button>
          )}

          {step === 'review' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePlaceOrder}
              disabled={placing}
              className={`w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                placing ? 'bg-indigo-500/70 cursor-wait' : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              {placing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Placing Order…
                </>
              ) : (
                <>
                  <Lock size={14} />
                  {`Pay $${(totalCents / 100).toFixed(2)}`}
                </>
              )}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}
