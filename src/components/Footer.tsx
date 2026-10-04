'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function Footer() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <footer
      style={{
        backgroundColor: 'var(--bg-dark)',
        borderTop: '1px solid var(--border-color)',
        paddingTop: 'var(--space-16)',
        paddingBottom: 'var(--space-10)',
        marginTop: 'var(--space-20)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="container">
        {/* Main Footer 4-Column Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-10)',
            marginBottom: 'var(--space-12)',
          }}
        >
          {/* Brand Info Column */}
          <div style={{ maxWidth: '320px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontWeight: 800,
                fontSize: '1.35rem',
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: 'var(--color-brand-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                }}
              >
                N
              </span>
              <span>{t('brand.name')}</span>
            </Link>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.6,
                marginBottom: 'var(--space-5)',
              }}
            >
              {t('footer.tagline')}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <span className="badge badge-neutral">256-bit SSL</span>
              <span className="badge badge-neutral">Verified Checkout</span>
            </div>
          </div>

          {/* Catalog Links */}
          <div>
            <h4
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 'var(--space-4)',
                color: 'var(--text-primary)',
              }}
            >
              {t('footer.catalog')}
            </h4>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <li>
                <Link href="/products" style={{ color: 'var(--text-secondary)', transition: 'color var(--transition-fast)' }}>
                  {t('footer.allProducts')}
                </Link>
              </li>
              <li>
                <Link href="/categories" style={{ color: 'var(--text-secondary)', transition: 'color var(--transition-fast)' }}>
                  {t('footer.categories')}
                </Link>
              </li>
              <li>
                <Link href="/products?sortBy=createdAt&sortOrder=desc" style={{ color: 'var(--text-secondary)', transition: 'color var(--transition-fast)' }}>
                  {t('footer.newArrivals')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Account & Orders */}
          <div>
            <h4
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 'var(--space-4)',
                color: 'var(--text-primary)',
              }}
            >
              {t('footer.accountAndOrders')}
            </h4>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <li>
                <Link href="/account" style={{ color: 'var(--text-secondary)', transition: 'color var(--transition-fast)' }}>
                  {t('footer.myAccount')}
                </Link>
              </li>
              <li>
                <Link href="/orders" style={{ color: 'var(--text-secondary)', transition: 'color var(--transition-fast)' }}>
                  {t('footer.orderTracking')}
                </Link>
              </li>
              <li>
                <Link href="/cart" style={{ color: 'var(--text-secondary)', transition: 'color var(--transition-fast)' }}>
                  {t('footer.shoppingCart')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Store Guarantees */}
          <div>
            <h4
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 'var(--space-4)',
                color: 'var(--text-primary)',
              }}
            >
              {t('footer.guaranteesTitle')}
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg style={{ width: '16px', height: '16px', color: 'var(--color-brand-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{t('footer.fastProcessing')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg style={{ width: '16px', height: '16px', color: 'var(--color-brand-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>{t('footer.verifiedCheckout')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg style={{ width: '16px', height: '16px', color: 'var(--color-brand-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{t('footer.returnPolicy')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg style={{ width: '16px', height: '16px', color: 'var(--color-brand-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>{t('footer.support247')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Copyright, Legal & Language Toggle */}
        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: 'var(--space-6)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            gap: 'var(--space-4)',
          }}
        >
          <p>© {new Date().getFullYear()} Nexora Commerce Inc. {t('footer.rightsReserved')}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <span>{t('footer.privacyPolicy')}</span>
            <span>•</span>
            <span>{t('footer.termsOfService')}</span>
            <span>•</span>
            <span>{t('footer.refundPolicy')}</span>
          </div>

          <button
            type="button"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-brand-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            {locale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
          </button>
        </div>
      </div>
    </footer>
  );
}
