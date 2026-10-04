'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ProductImage } from '@/components/ProductImage';

export default function CartPage() {
  const { user } = useAuth();
  const { cart, itemCount, subtotal, updateQuantity, removeItem, clearCart, isLoading } = useCart();
  const { t } = useLanguage();

  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 10;
  const tax = subtotal * 0.08;
  const grandTotal = subtotal + shipping + tax;

  if (!user) {
    return (
      <div className="container container-narrow" style={{ paddingBlock: 'var(--space-20)', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-12)', backgroundColor: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
            {t('cart.title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
            {t('cart.emptyDesc')}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <Link href="/login" className="btn btn-primary btn-lg">
              {t('nav.login')}
            </Link>
            <Link href="/register" className="btn btn-secondary btn-lg">
              {t('nav.register')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-12)' }}>
        <h1 className="heading-section" style={{ marginBottom: 'var(--space-8)' }}>{t('cart.title')}</h1>
        <div className="grid-checkout">
          <div className="skeleton" style={{ height: '300px' }} />
          <div className="skeleton" style={{ height: '240px' }} />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container container-narrow" style={{ paddingBlock: 'var(--space-16)', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-12)', backgroundColor: 'var(--bg-surface)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--border-radius-full)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--color-brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {t('cart.emptyTitle')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-6)' }}>
            {t('cart.emptyDesc')}
          </p>
          <Link href="/products" className="btn btn-primary">
            {t('cart.startShopping')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-12)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div>
          <h1 className="heading-section">{t('cart.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
            {itemCount} {itemCount === 1 ? t('catalog.productFound') : t('catalog.productsFound')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => clearCart()}
          className="btn btn-outline btn-sm"
          style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
        >
          {t('cart.clearCart')}
        </button>
      </div>

      <div className="grid-checkout">
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {cart.items.map((item) => {
            const price = typeof item.product.price === 'string' ? parseFloat(item.product.price) : Number(item.product.price);
            const lineSubtotal = price * item.quantity;

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: 'var(--border-radius-md)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <ProductImage src={(item.product as unknown as { image?: string | null }).image} alt={item.product.name} aspectRatio="1/1" />
                </div>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <Link href={`/products/${item.product.slug}`}>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.product.name}
                    </h3>
                  </Link>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                    SKU: {item.product.sku} • ${price.toFixed(2)}
                  </p>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-sm)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            removeItem(item.id);
                          }
                        }}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        -
                      </button>
                      <span style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        style={{
                          padding: '4px 10px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-error)',
                        fontSize: 'var(--font-size-xs)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Line total */}
                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                  <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ${lineSubtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '96px', backgroundColor: 'var(--bg-surface)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
              {t('cart.summaryTitle')}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('cart.subtotal')}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${subtotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('cart.shipping')}</span>
                <span>
                  {shipping === 0 ? (
                    <span className="badge badge-success">FREE</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estimated Tax (8%)</span>
                <span style={{ color: 'var(--text-primary)' }}>${tax.toFixed(2)}</span>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: 'var(--space-3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                <span>{t('cart.total')}</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
              {t('cart.proceedToCheckout')} →
            </Link>

            <Link href="/products" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              {t('cart.startShopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
