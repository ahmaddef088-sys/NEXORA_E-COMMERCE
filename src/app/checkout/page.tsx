'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

interface Address {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  addressLine: string;
  postalCode?: string | null;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, itemCount, subtotal, refreshCart } = useCart();
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH' | 'BANK_TRANSFER' | 'PAYPAL'>('CARD');
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New address inline form state
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('US');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    async function loadAddresses() {
      try {
        const res = await fetch('/api/account/addresses');
        if (res.ok) {
          const json = await res.json();
          const list: Address[] = json.data ?? [];
          setAddresses(list);
          const defaultAddr = list.find((a) => a.isDefault) ?? list[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
          } else {
            setShowNewAddress(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAddresses();
  }, [user, router]);

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !city || !addressLine) {
      showToast('Please fill in all required address fields', 'error');
      return;
    }

    try {
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          country,
          city,
          addressLine,
          postalCode: postalCode || undefined,
          isDefault: addresses.length === 0,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error?.message || 'Failed to save address', 'error');
        return;
      }

      const newAddr: Address = json.data;
      setAddresses((prev) => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowNewAddress(false);
      showToast('Address added successfully!', 'success');
    } catch {
      showToast('Network error while saving address', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showToast('Please select or add a shipping address', 'error');
      return;
    }

    if (!cart || cart.items.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Order via /api/checkout
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddressId: selectedAddressId,
          notes: orderNotes.trim() || undefined,
        }),
      });

      const checkoutJson = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutJson.success) {
        showToast(checkoutJson.error?.message || 'Failed to place order', 'error');
        setIsSubmitting(false);
        return;
      }

      const order = checkoutJson.data;

      // 2. Process Payment via /api/payments
      const paymentRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          method: paymentMethod,
        }),
      });

      const paymentJson = await paymentRes.json();
      if (!paymentRes.ok || !paymentJson.success) {
        showToast('Order created, but payment initialization failed.', 'error');
      } else {
        showToast('Order placed successfully!', 'success');
      }

      // 3. Clear cart in state & redirect to order details
      await refreshCart();
      router.push(`/orders/${order.id}`);
    } catch {
      showToast('An error occurred during checkout', 'error');
      setIsSubmitting(false);
    }
  };

  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 10;
  const tax = subtotal * 0.08;
  const grandTotal = subtotal + shipping + tax;

  if (loading) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-12)' }}>
        <h1 className="heading-section" style={{ marginBottom: 'var(--space-8)' }}>Checkout</h1>
        <div className="grid-checkout">
          <div className="skeleton" style={{ height: '400px' }} />
          <div className="skeleton" style={{ height: '300px' }} />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container container-narrow" style={{ paddingBlock: 'var(--space-20)', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-12)' }}>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-4)' }}>
            Your Cart is Empty
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
            You need to add products to your cart before proceeding to checkout.
          </p>
          <Link href="/products" className="btn btn-primary btn-lg">
            Browse Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-10)' }}>
      <h1 className="heading-section" style={{ marginBottom: 'var(--space-8)' }}>Checkout</h1>

      <div className="grid-checkout">
        {/* Left Side: Address & Payment Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Shipping Address Section */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
              }}
            >
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                1. Shipping Address
              </h2>
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewAddress(!showNewAddress)}
                  className="btn btn-secondary btn-sm"
                >
                  {showNewAddress ? 'Cancel' : '+ Add New Address'}
                </button>
              )}
            </div>

            {/* Saved Addresses List */}
            {!showNewAddress && addresses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--border-radius-md)',
                      border: `2px solid ${selectedAddressId === addr.id ? 'var(--color-brand-primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      background: selectedAddressId === addr.id ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    }}
                  >
                    <input
                      type="radio"
                      name="shippingAddress"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      style={{ marginTop: '4px' }}
                    />
                    <div style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 600 }}>{addr.fullName}</span>
                        {addr.isDefault && <span className="badge badge-neutral">Default</span>}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {addr.addressLine}, {addr.city}, {addr.country} {addr.postalCode}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                        Phone: {addr.phone}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              /* Inline Address Form */
              <form onSubmit={handleCreateAddress}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                  Enter Shipping Address
                </h3>
                <div className="input-group">
                  <label className="input-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="input-group">
                    <label className="input-label">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-field"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Country *</label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Address Line *</label>
                  <input
                    type="text"
                    required
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    className="input-field"
                    placeholder="123 Commerce Way, Apt 4B"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="input-group">
                    <label className="input-label">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input-field"
                      placeholder="New York"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="input-field"
                      placeholder="10001"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-2)' }}>
                  Save & Use This Address
                </button>
              </form>
            )}
          </div>

          {/* Payment Method Section */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              2. Payment Method
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
              {[
                {
                  id: 'CARD',
                  label: 'Credit / Debit Card',
                  svg: (
                    <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  id: 'CASH',
                  label: 'Cash on Delivery',
                  svg: (
                    <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                },
                {
                  id: 'BANK_TRANSFER',
                  label: 'Bank Transfer',
                  svg: (
                    <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  ),
                },
                {
                  id: 'PAYPAL',
                  label: 'PayPal',
                  svg: (
                    <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                },
              ].map((method) => (
                <label
                  key={method.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--border-radius-md)',
                    border: `2px solid ${paymentMethod === method.id ? 'var(--color-brand-primary)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    background: paymentMethod === method.id ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    textAlign: 'center',
                    gap: 'var(--space-2)',
                    color: paymentMethod === method.id ? 'var(--color-brand-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id as 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'PAYPAL')}
                    className="sr-only"
                  />
                  <span>{method.svg}</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Order Notes */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              Order Notes (Optional)
            </h2>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Delivery instructions..."
              className="input-field"
              rows={3}
            />
          </div>
        </div>

        {/* Right Side: Order Review & Confirmation */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '96px' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Order Summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </h2>

            {/* Item preview */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                maxHeight: '220px',
                overflowY: 'auto',
                marginBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: 'var(--space-4)',
              }}
            >
              {cart.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {item.quantity}x {item.product.name}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    ${(Number(item.product.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                <span>{shipping === 0 ? <span className="badge badge-success">FREE</span> : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: 'var(--space-3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || !selectedAddressId}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginBottom: 'var(--space-4)' }}
            >
              {isSubmitting ? 'Processing Order...' : `Pay $${grandTotal.toFixed(2)} & Place Order`}
            </button>

            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>256-bit SSL Encrypted Checkout</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
