'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ProductImage } from './ProductImage';

export interface ProductCardProps {
  product: {
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
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);

  const priceNum = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price);
  const compareNum = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice)
      : Number(product.compareAtPrice)
    : null;

  const discountPercent =
    compareNum && compareNum > priceNum
      ? Math.round(((compareNum - priceNum) / compareNum) * 100)
      : null;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    await addToCart(product.id, 1);
    setIsAdding(false);
  };

  return (
    <div
      className="card card-interactive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        position: 'relative',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div>
        {/* Image Frame — Visual Focus */}
        <Link
          href={`/products/${product.slug}`}
          style={{
            display: 'block',
            width: '100%',
            marginBottom: 'var(--space-3)',
            borderRadius: 'var(--border-radius-md)',
            overflow: 'hidden',
          }}
        >
          <ProductImage src={product.image} alt={product.name} aspectRatio="4/3" />
        </Link>

        {/* Category & Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-2)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          {product.category ? (
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{product.category.name}</span>
          ) : (
            <span />
          )}

          {discountPercent ? (
            <span className="badge badge-success">-{discountPercent}%</span>
          ) : isOutOfStock ? (
            <span className="badge badge-error">{t('productCard.outOfStock')}</span>
          ) : isLowStock ? (
            <span className="badge badge-warning">{t('productCard.lowStock', { count: product.stock })}</span>
          ) : null}
        </div>

        {/* Product Title */}
        <Link href={`/products/${product.slug}`}>
          <h3
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.4,
              marginBottom: 'var(--space-1)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.8em',
            }}
          >
            {product.name}
          </h3>
        </Link>

        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {t('productCard.sku')}: {product.sku}
        </p>
      </div>

      <div>
        {/* Pricing */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            ${priceNum.toFixed(2)}
          </span>
          {compareNum && compareNum > priceNum && (
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-muted)',
                textDecoration: 'line-through',
              }}
            >
              ${compareNum.toFixed(2)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className="btn btn-primary btn-sm"
          style={{ width: '100%' }}
        >
          {isAdding ? (
            t('productCard.adding')
          ) : isOutOfStock ? (
            t('productCard.outOfStock')
          ) : (
            t('productCard.addToCart')
          )}
        </button>
      </div>
    </div>
  );
}
