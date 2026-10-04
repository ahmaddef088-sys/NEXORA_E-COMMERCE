'use client';

import React, { useEffect, useState, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { ProductSkeleton } from '@/components/Skeleton';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Category {
  id: string;
  name: string;
  slug: string;
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

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const currentSearch = searchParams.get('search') ?? '';
  const currentCategory = searchParams.get('categoryId') ?? '';
  const currentSort = searchParams.get('sort') ?? 'createdAt:desc';
  const currentMinPrice = searchParams.get('minPrice') ?? '';
  const currentMaxPrice = searchParams.get('maxPrice') ?? '';
  const currentInStock = searchParams.get('inStock') === 'true';
  const currentPage = parseInt(searchParams.get('page') ?? '1', 10);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [, startTransition] = useTransition();

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCategories(json.data ?? []);
      })
      .catch(() => {});
  }, []);

  // Fetch products whenever params change
  useEffect(() => {
    let ignore = false;
    const [sortBy, sortOrder] = currentSort.split(':');
    const params = new URLSearchParams();
    if (currentSearch) params.set('search', currentSearch);
    if (currentCategory) params.set('categoryId', currentCategory);
    if (currentMinPrice) params.set('minPrice', currentMinPrice);
    if (currentMaxPrice) params.set('maxPrice', currentMaxPrice);
    if (currentInStock) params.set('inStock', 'true');
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    params.set('page', String(currentPage));
    params.set('limit', '12');

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore && json.success) {
          setProducts(json.data ?? []);
          if (json.meta) setMeta(json.meta);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [currentSearch, currentCategory, currentSort, currentMinPrice, currentMaxPrice, currentInStock, currentPage]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    setLoading(true);
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    // Reset to page 1 on filter changes unless page is explicitly updated
    if (!('page' in newParams)) {
      params.set('page', '1');
    }
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() || null });
  };

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-12)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="heading-section">{t('catalog.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
          {meta.total} {meta.total === 1 ? t('catalog.productFound') : t('catalog.productsFound')}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        {/* Top row: search + category + sort */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search input */}
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: 'flex', gap: 'var(--space-2)', flex: '1', minWidth: '240px' }}
          >
            <input
              type="search"
              placeholder={t('nav.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-field"
            />
            <button type="submit" className="btn btn-primary">
              {t('catalog.search')}
            </button>
          </form>

          {/* Category filter */}
          <select
            value={currentCategory}
            onChange={(e) => updateFilters({ categoryId: e.target.value || null })}
            className="input-field"
            style={{ width: 'auto', minWidth: '170px' }}
          >
            <option value="">{t('catalog.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort selector */}
          <select
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="input-field"
            style={{ width: 'auto', minWidth: '190px' }}
          >
            <option value="createdAt:desc">{t('catalog.sortNewest')}</option>
            <option value="price:asc">{t('catalog.sortPriceLow')}</option>
            <option value="price:desc">{t('catalog.sortPriceHigh')}</option>
            <option value="name:asc">{t('catalog.sortName')}</option>
          </select>
        </div>

        {/* Second row: Price range & availability */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            alignItems: 'center',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--border-color)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('catalog.filters')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span>{t('catalog.priceRange')}</span>
            <input
              type="number"
              placeholder="Min $"
              min="0"
              value={currentMinPrice}
              onChange={(e) => updateFilters({ minPrice: e.target.value || null })}
              className="input-field"
              style={{ width: '85px', padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}
            />
            <span>–</span>
            <input
              type="number"
              placeholder="Max $"
              min="0"
              value={currentMaxPrice}
              onChange={(e) => updateFilters({ maxPrice: e.target.value || null })}
              className="input-field"
              style={{ width: '85px', padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={currentInStock}
              onChange={(e) => updateFilters({ inStock: e.target.checked ? 'true' : null })}
            />
            <span>{t('catalog.inStockOnly')}</span>
          </label>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid-products">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid-products">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-12)',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => updateFilters({ page: String(currentPage - 1) })}
              >
                {t('catalog.previous')}
              </button>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {t('catalog.pageOf', { page: currentPage, totalPages: meta.totalPages })}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= meta.totalPages}
                onClick={() => updateFilters({ page: String(currentPage + 1) })}
              >
                {t('catalog.next')}
              </button>
            </div>
          )}
        </>
      ) : (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-16)',
            color: 'var(--text-secondary)',
          }}
        >
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {t('catalog.noProductsMatch')}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
            {t('catalog.noProductsMatchDesc')}
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setSearchInput('');
              router.push('/products');
            }}
          >
            {t('catalog.clearFilters')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: 'var(--space-10)' }}>Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
