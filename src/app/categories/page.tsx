'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CategorySkeleton } from '@/components/Skeleton';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export default function CategoriesPage() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setCategories(json.data ?? []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-12)' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="heading-section">{t('categoriesPage.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-base)' }}>
          {t('categoriesPage.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="grid-categories">
          {Array.from({ length: 6 }).map((_, i) => (
            <CategorySkeleton key={i} />
          ))}
        </div>
      ) : categories.length > 0 ? (
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
                minHeight: '160px',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 700,
                    marginBottom: 'var(--space-2)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {category.name}
                </h3>
                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {category.description || t('categoriesPage.browseCategory')}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-brand-primary)',
                  marginTop: 'var(--space-4)',
                }}
              >
                <span>{t('categoriesPage.browseCategory')}</span>
                <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
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
            {t('categoriesPage.noCategories')}
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {t('categoriesPage.noCategoriesDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
