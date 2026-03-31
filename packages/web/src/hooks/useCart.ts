import { useState, useCallback } from 'react';
import type { Product } from '../data/mockData';

export type LocalCartItem = {
  product: Product;
  quantity: number;
};

const STORAGE_KEY = 'greggie_cart';

function loadCart(): LocalCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: LocalCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<LocalCartItem[]>(loadCart);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      let next: LocalCartItem[];
      if (existing) {
        next = prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      } else {
        next = [...prev, { product, quantity }];
      }
      saveCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems(prev => {
      const next = prev.map(i =>
        i.product.id === productId ? { ...i, quantity: Math.max(1, quantity) } : i,
      );
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.product.id !== productId);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, count, total, addItem, updateQuantity, removeItem, clearCart };
}
