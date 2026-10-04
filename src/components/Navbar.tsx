'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { locale, setLocale, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/products');
    }
  };

  const toggleLanguage = () => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '68px',
          gap: 'var(--space-4)',
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontWeight: 800,
            fontSize: '1.35rem',
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: 'var(--color-brand-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 800,
            }}
          >
            N
          </span>
          <span>{t('brand.name')}</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-6)',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
          className="desktop-nav"
        >
          <Link href="/" className="nav-link" style={{ color: 'var(--text-primary)' }}>
            {t('nav.home')}
          </Link>
          <Link href="/products" className="nav-link" style={{ color: 'var(--text-secondary)' }}>
            {t('nav.shop')}
          </Link>
          <Link href="/categories" className="nav-link" style={{ color: 'var(--text-secondary)' }}>
            {t('nav.categories')}
          </Link>
          <Link
            href="/products?sortBy=createdAt&sortOrder=desc"
            className="nav-link"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('nav.newArrivals')}
          </Link>
        </nav>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          style={{
            flex: '1',
            maxWidth: '420px',
            position: 'relative',
            display: 'none',
          }}
          className="desktop-search"
        >
          <input
            type="search"
            placeholder={t('nav.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{
              paddingInlineStart: '34px',
              height: '38px',
              fontSize: 'var(--font-size-xs)',
              borderRadius: 'var(--border-radius-md)',
            }}
          />
          <svg
            style={{
              position: 'absolute',
              insetInlineStart: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '15px',
              height: '15px',
              color: 'var(--text-muted)',
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </form>

        {/* Right Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
            title="Switch Language"
          >
            {locale === 'ar' ? 'EN' : 'العربية'}
          </button>

          {/* Cart Link */}
          <Link
            href="/cart"
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            aria-label={`${t('nav.cart')} (${itemCount})`}
          >
            <svg
              style={{ width: '17px', height: '17px' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span style={{ fontWeight: 600 }}>{t('nav.cart')}</span>
            {itemCount > 0 && (
              <span
                style={{
                  backgroundColor: 'var(--color-brand-accent)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                }}
              >
                {itemCount}
              </span>
            )}
          </Link>

          {/* Account */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Link
                href="/account"
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{user.name.split(' ')[0]}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn btn-secondary btn-sm"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Link href="/login" className="btn btn-secondary btn-sm">
                {t('nav.login')}
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                {t('nav.register')}
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-color)',
            padding: 'var(--space-4) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <form onSubmit={handleSearch} style={{ marginBottom: 'var(--space-2)' }}>
            <input
              type="search"
              placeholder={t('nav.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
          </form>
          <Link href="/" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('nav.home')}
          </Link>
          <Link href="/products" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('nav.shop')}
          </Link>
          <Link href="/categories" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('nav.categories')}
          </Link>
          <Link href="/products?sortBy=createdAt&sortOrder=desc" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('nav.newArrivals')}
          </Link>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle-btn {
            display: block !important;
          }
        }
        @media (min-width: 768px) {
          .desktop-search {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}
