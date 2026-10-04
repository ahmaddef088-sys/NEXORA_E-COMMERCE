'use client';

import React, { useState } from 'react';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  aspectRatio?: string;
}

export function ProductImage({
  src,
  alt,
  style,
  aspectRatio = '4/3',
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio,
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: 'var(--border-radius-md)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  if (!src || hasError) {
    return (
      <div style={containerStyle} aria-label={alt}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--text-muted)',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <svg
            style={{ width: '36px', height: '36px', opacity: 0.5 }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            Nexora Catalog Item
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {!isLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity var(--transition-base), transform var(--transition-base)',
        }}
      />
    </div>
  );
}
