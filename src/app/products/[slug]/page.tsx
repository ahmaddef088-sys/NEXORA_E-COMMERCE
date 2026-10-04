'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/ProductCard';
import { ProductImage } from '@/components/ProductImage';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const { addToCart } = useCart();
  const { t } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadProduct() {
      try {
        const res = await fetch(`/api/products/slug/${resolvedParams.slug}`);
        if (!res.ok) {
          if (!ignore) setProduct(null);
          return;
        }
        const json = await res.json();
        const prod = json.data ?? null;
        if (!ignore) {
          setProduct(prod);
          if (prod?.id) {
            fetch(`/api/products/${prod.id}/related?limit=4`)
              .then((r) => (r.ok ? r.json() : null))
              .then((relJson) => {
                if (!ignore && relJson?.data) setRelatedProducts(relJson.data);
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error(err);
        if (!ignore) setProduct(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProduct();
    return () => {
      ignore = true;
    };
  }, [resolvedParams.slug]);

  if (loading) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-16)' }}>
        <div className="grid-2col">
          <div className="skeleton" style={{ height: '420px', borderRadius: 'var(--border-radius-lg)' }} />
          <div>
            <div className="skeleton" style={{ height: '32px', width: '70%', marginBottom: 'var(--space-4)' }} />
            <div className="skeleton" style={{ height: '24px', width: '30%', marginBottom: 'var(--space-6)' }} />
            <div className="skeleton" style={{ height: '80px', width: '100%', marginBottom: 'var(--space-6)' }} />
            <div className="skeleton" style={{ height: '48px', width: '50%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ paddingBlock: 'var(--space-20)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
          {t('catalog.noProductsMatch')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          {t('catalog.noProductsMatchDesc')}
        </p>
        <Link href="/products" className="btn btn-primary">
          {t('productDetail.backToCatalog')}
        </Link>
      </div>
    );
  }

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
  const maxAllowedQty = Math.min(product.stock, 10);

  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    await addToCart(product.id, quantity);
    setIsAdding(false);
  };

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-12)' }}>
      {/* Breadcrumb */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-8)',
        }}
        aria-label="Breadcrumb"
      >
        <Link href="/" style={{ color: 'var(--text-secondary)' }}>
          {t('nav.home')}
        </Link>
        <span>/</span>
        <Link href="/products" style={{ color: 'var(--text-secondary)' }}>
          {t('nav.shop')}
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/products?categoryId=${product.category.id}`}
              style={{ color: 'var(--text-secondary)' }}
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid-2col" style={{ alignItems: 'start', gap: 'var(--space-12)' }}>
        {/* Product Image Frame */}
        <div
          className="card"
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--border-radius-xl)',
            border: '1px solid var(--border-color)',
          }}
        >
          <ProductImage src={product.image} alt={product.name} aspectRatio="1/1" />
        </div>

        {/* Product Information */}
        <div>
          {/* Category & Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {product.category && (
              <span className="badge badge-neutral">{product.category.name}</span>
            )}
            {isOutOfStock ? (
              <span className="badge badge-error">{t('productDetail.outOfStock')}</span>
            ) : product.stock <= 5 ? (
              <span className="badge badge-warning">{t('productCard.lowStock', { count: product.stock })}</span>
            ) : (
              <span className="badge badge-success">{t('productDetail.inStockCount', { count: product.stock })}</span>
            )}
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: 'var(--space-4)',
              color: 'var(--text-primary)',
            }}
          >
            {product.name}
          </h1>

          {/* Pricing */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              ${priceNum.toFixed(2)}
            </span>
            {compareNum && compareNum > priceNum && (
              <>
                <span
                  style={{
                    fontSize: 'var(--font-size-lg)',
                    color: 'var(--text-muted)',
                    textDecoration: 'line-through',
                  }}
                >
                  ${compareNum.toFixed(2)}
                </span>
                <span className="badge badge-success">Save {discountPercent}%</span>
              </>
            )}
          </div>

          {/* Description */}
          <div
            style={{
              paddingTop: 'var(--space-4)',
              paddingBottom: 'var(--space-6)',
              borderTop: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
              {t('productDetail.description')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 'var(--font-size-sm)' }}>
              {product.description || 'No detailed description has been provided for this product.'}
            </p>
          </div>

          {/* Quantity selector and Add to Cart action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
            {!isOutOfStock && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('productDetail.quantity')}:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-elevated)' }}>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    style={{
                      padding: '8px 14px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    -
                  </button>
                  <span style={{ padding: '8px 16px', fontWeight: 600, minWidth: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxAllowedQty, q + 1))}
                    disabled={quantity >= maxAllowedQty}
                    style={{
                      padding: '8px 14px',
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
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAdding}
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
              >
                {isAdding ? t('productCard.adding') : isOutOfStock ? t('productCard.outOfStock') : t('productDetail.addToCart')}
              </button>
            </div>
          </div>

          {/* Guarantees Box */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--bg-surface)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg style={{ width: '15px', height: '15px', color: 'var(--color-success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{t('productDetail.guaranteeFast')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg style={{ width: '15px', height: '15px', color: 'var(--color-success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{t('productDetail.guaranteeSecure')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg style={{ width: '15px', height: '15px', color: 'var(--color-success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{t('productDetail.guaranteeReturn')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Discovery */}
      {relatedProducts.length > 0 && (
        <section style={{ marginTop: 'var(--space-20)', paddingTop: 'var(--space-12)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className="heading-section">{t('productDetail.relatedProducts')}</h2>
          </div>
          <div className="grid-products">
            {relatedProducts.map((relProd) => (
              <ProductCard key={relProd.id} product={relProd} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
