'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: string | number;
    stock: number;
    isActive: boolean;
    categoryId: string | null;
  };
};

export type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
};

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (itemId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  removeItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  clearCart: () => Promise<{ success: boolean; error?: string }>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch('/api/cart');
      if (res.ok) {
        const json = await res.json();
        setCart(json.data ?? null);
      } else {
        setCart(null);
      }
    } catch {
      setCart(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let ignore = false;
    if (!user) {
      return;
    }

    fetch('/api/cart')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!ignore) {
          setCart(json?.data ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setCart(null);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [user]);

  const displayedCart = user ? cart : null;

  const itemCount = displayedCart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const subtotal =
    displayedCart?.items?.reduce((sum, item) => {
      const price = typeof item.product.price === 'string' ? parseFloat(item.product.price) : Number(item.product.price);
      return sum + (isNaN(price) ? 0 : price * item.quantity);
    }, 0) ?? 0;

  const addToCart = async (productId: string, quantity = 1): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      showToast('Please log in to add items to your cart', 'info');
      return { success: false, error: 'Authentication required' };
    }

    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg = json.error?.message || 'Failed to add item to cart';
        showToast(errMsg, 'error');
        return { success: false, error: errMsg };
      }

      setCart(json.data);
      showToast('Added to cart successfully!', 'success');
      return { success: true };
    } catch {
      showToast('Network error while updating cart', 'error');
      return { success: false, error: 'Network error' };
    }
  };

  const updateQuantity = async (itemId: string, quantity: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg = json.error?.message || 'Failed to update quantity';
        showToast(errMsg, 'error');
        return { success: false, error: errMsg };
      }

      setCart(json.data);
      return { success: true };
    } catch {
      showToast('Network error while updating cart item', 'error');
      return { success: false, error: 'Network error' };
    }
  };

  const removeItem = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg = json.error?.message || 'Failed to remove item';
        showToast(errMsg, 'error');
        return { success: false, error: errMsg };
      }

      setCart(json.data);
      showToast('Item removed from cart', 'info');
      return { success: true };
    } catch {
      showToast('Network error while removing item', 'error');
      return { success: false, error: 'Network error' };
    }
  };

  const clearCart = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg = json.error?.message || 'Failed to clear cart';
        showToast(errMsg, 'error');
        return { success: false, error: errMsg };
      }

      setCart(json.data);
      return { success: true };
    } catch {
      showToast('Network error while clearing cart', 'error');
      return { success: false, error: 'Network error' };
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart: displayedCart,
        itemCount,
        subtotal,
        isLoading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
