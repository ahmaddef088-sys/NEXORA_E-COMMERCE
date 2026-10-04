'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
}

interface Address {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  addressLine: string;
  postalCode?: string | null;
}

interface Payment {
  id: string;
  amount: string;
  method: string;
  status: string;
}

interface OrderDetail {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal: string;
  shipping: string;
  tax: string;
  discount: string;
  total: string;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
  shippingAddress: Address | null;
  payment: Payment | null;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/orders/${resolvedParams.id}`);
      return;
    }

    if (user) {
      fetch(`/api/orders/${resolvedParams.id}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setOrder(json.data);
          } else {
            setOrder(null);
          }
        })
        .catch(() => setOrder(null))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, resolvedParams.id, router]);

  if (authLoading || loading) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-12)' }}>
        <div className="skeleton" style={{ height: '30px', width: '250px', marginBottom: 'var(--space-6)' }} />
        <div className="skeleton" style={{ height: '350px' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container container-narrow" style={{ paddingBlock: 'var(--space-20)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-4)' }}>
          Order Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          We could not locate this order or you do not have permission to view it.
        </p>
        <Link href="/orders" className="btn btn-primary">
          Back to My Orders
        </Link>
      </div>
    );
  }

  const steps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentStepIdx = steps.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-10)' }}>
      {/* Navigation header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link
          href="/orders"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-primary-600)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: 'var(--space-2)',
          }}
        >
          ← Back to Orders
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <h1 className="heading-section">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '2px' }}>
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span
            className={`badge ${
              order.status === 'DELIVERED'
                ? 'badge-success'
                : order.status === 'CANCELLED'
                ? 'badge-error'
                : 'badge-info'
            }`}
            style={{ fontSize: 'var(--font-size-sm)', padding: '6px 12px' }}
          >
            {order.status}
          </span>
        </div>
      </div>

      {/* Status Progress Bar */}
      {!isCancelled && currentStepIdx !== -1 && (
        <div className="card" style={{ marginBottom: 'var(--space-8)', padding: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              position: 'relative',
              margin: '0 var(--space-4)',
            }}
          >
            {/* Connecting line */}
            <div
              style={{
                position: 'absolute',
                top: '14px',
                left: 0,
                right: 0,
                height: '4px',
                backgroundColor: 'var(--color-neutral-200)',
                zIndex: 0,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
                  backgroundColor: 'var(--color-brand-primary)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {/* Step circles */}
            {steps.map((step, idx) => {
              const isPassed = idx <= currentStepIdx;
              return (
                <div
                  key={step}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: isPassed ? 'var(--color-brand-primary)' : 'var(--bg-surface)',
                      border: `2px solid ${isPassed ? 'var(--color-brand-primary)' : 'var(--color-neutral-300)'}`,
                      color: isPassed ? '#ffffff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {isPassed ? (
                      <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: isPassed ? 600 : 400,
                      color: isPassed ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Order Content */}
      <div className="grid-checkout">
        {/* Left: Items Snapshot Table */}
        <div className="card">
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Purchased Items ({order.items.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {order.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBlock: 'var(--space-3)',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                    {item.productName}
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    SKU: {item.sku} • {item.quantity} x ${parseFloat(item.unitPrice).toFixed(2)}
                  </p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                  ${parseFloat(item.subtotal).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {order.notes && (
            <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-3)', background: 'var(--color-neutral-50)', borderRadius: 'var(--border-radius-md)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Order Notes:
              </span>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Summary, Shipping & Payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Order Totals */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Order Financials
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>${parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                <span>${parseFloat(order.shipping).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                <span>${parseFloat(order.tax).toFixed(2)}</span>
              </div>
              {parseFloat(order.discount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
                  <span>Discount</span>
                  <span>-${parseFloat(order.discount).toFixed(2)}</span>
                </div>
              )}
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
                <span>Total Paid</span>
                <span>${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address Snapshot */}
          {order.shippingAddress && (
            <div className="card">
              <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Delivery Address
              </h2>
              <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{order.shippingAddress.fullName}</p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {order.shippingAddress.addressLine}, {order.shippingAddress.city}, {order.shippingAddress.country} {order.shippingAddress.postalCode}
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                Phone: {order.shippingAddress.phone}
              </p>
            </div>
          )}

          {/* Payment Status */}
          {order.payment && (
            <div className="card">
              <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Payment Information
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Method: {order.payment.method}</span>
                <span className={`badge ${order.payment.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                  {order.payment.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
