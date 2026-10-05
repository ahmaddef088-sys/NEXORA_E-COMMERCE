'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { ProductSkeleton } from '@/components/Skeleton';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  stock: number;
  isActive: boolean;
  image?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function HomePage() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setProductsError(false);

      // Categories are non-critical for the homepage: failure just hides the section.
      const categoriesPromise = fetch('/api/categories', { cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) return;
          const catJson = await res.json();
          if (!ignore && catJson.success) {
            setCategories(catJson.data?.slice(0, 6) ?? []);
          }
        })
        .catch((err) => console.error('Failed to load categories', err));

      const productsPromise = fetch('/api/products?limit=8&sortBy=createdAt&sortOrder=desc', {
        cache: 'no-store',
      })
        .then(async (res) => {
          const prodJson = await res.json().catch(() => null);
          if (!res.ok || !prodJson?.success || !Array.isArray(prodJson.data)) {
            throw new Error(`Products request failed with status ${res.status}`);
          }
          if (!ignore) setFeaturedProducts(prodJson.data);
        })
        .catch((err) => {
          console.error('Failed to load products', err);
          if (!ignore) {
            setFeaturedProducts([]);
            setProductsError(true);
          }
        });

      await Promise.all([categoriesPromise, productsPromise]);
      if (!ignore) setLoading(false);
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  return (
    <div>
      {/* ── 1. Store Commercial Hero Banner ────────────────────────────────── */}
      <section className="hero-banner-section">
        <div className="container">
          <div className="hero-banner-grid">
            <div className="hero-banner-content">
              <span className="hero-badge">
                {t('hero.badge')}
              </span>

              <h1 className="heading-hero hero-title">
                {t('hero.title')}
              </h1>

              <p className="hero-subtitle">
                {t('hero.subtitle')}
              </p>

              <div className="hero-actions">
                <Link href="/products" className="btn btn-primary btn-lg">
                  {t('hero.exploreBtn')} →
                </Link>
                <Link href="/categories" className="btn btn-secondary btn-lg">
                  {t('hero.categoriesBtn')}
                </Link>
              </div>
            </div>

            <div className="hero-banner-image-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/nexora-hero.png"
                alt={t('hero.title')}
                width={1024}
                height={576}
                className="hero-banner-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Store Policy Guarantees Bar ───────────────────────────────── */}
      <section
        style={{
          padding: 'var(--space-8) 0',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <svg style={{ width: '22px', height: '22px', color: 'var(--color-brand-primary)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  {t('guarantees.expressTitle')}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                  {t('guarantees.expressDesc')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <svg style={{ width: '22px', height: '22px', color: 'var(--color-brand-primary)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  {t('guarantees.secureTitle')}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                  {t('guarantees.secureDesc')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <svg style={{ width: '22px', height: '22px', color: 'var(--color-brand-primary)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  {t('guarantees.authenticTitle')}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                  {t('guarantees.authenticDesc')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <svg style={{ width: '22px', height: '22px', color: 'var(--color-brand-primary)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  {t('guarantees.returnsTitle')}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                  {t('guarantees.returnsDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Category Navigation Grid ─────────────────────────────────────── */}
      {categories.length > 0 && (
        <section style={{ padding: 'var(--space-12) 0' }}>
          <div className="container">
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-6)',
              }}
            >
              <div>
                <h2 className="heading-section">
                  {t('categoriesPage.title')}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '2px' }}>
                  {t('categoriesPage.subtitle')}
                </p>
              </div>
              <Link href="/categories" className="btn btn-outline btn-sm">
                {t('categoriesPage.title')} →
              </Link>
            </div>

            <div className="grid-categories">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?categoryId=${category.id}`}
                  className="card card-interactive"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '130px',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-1)', color: 'var(--text-primary)' }}>
                      {category.name}
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {category.description || t('categoriesPage.browseCategory')}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-brand-primary)', marginTop: 'var(--space-3)' }}>
                    <span>{t('categoriesPage.browseCategory')}</span>
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. New Arrivals Product Grid ────────────────────────────────────── */}
      <section style={{ padding: 'var(--space-12) 0', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div>
              <h2 className="heading-section">
                {t('nav.newArrivals')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '2px' }}>
                {t('hero.subtitle')}
              </p>
            </div>
            <Link href="/products" className="btn btn-primary btn-sm">
              {t('catalog.title')} →
            </Link>
          </div>

          {loading ? (
            <div className="grid-products">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : productsError ? (
            <div
              className="card"
              role="alert"
              style={{
                textAlign: 'center',
                padding: 'var(--space-12)',
                color: 'var(--text-secondary)',
              }}
            >
              <p style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-4)' }}>
                {t('catalog.loadError')}
              </p>
              <button
                type="button"
                id="home-products-retry"
                className="btn btn-outline btn-sm"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                {t('catalog.retry')}
              </button>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid-products">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: 'var(--space-12)',
                color: 'var(--text-secondary)',
              }}
            >
              <p style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-2)' }}>
                {t('catalog.noProductsMatch')}
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                {t('catalog.noProductsMatchDesc')}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
