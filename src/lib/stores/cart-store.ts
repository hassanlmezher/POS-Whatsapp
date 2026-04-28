"use client";

import { create } from "zustand";
import type { Product } from "@/lib/types/domain";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartState = {
  customerId: string | null;
  paymentMethod: "cash" | "card";
  items: CartItem[];
  setCustomer: (customerId: string | null) => void;
  setPaymentMethod: (method: "cash" | "card") => void;
  addItem: (product: Product) => void;
  decrementItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  customerId: null,
  paymentMethod: "cash",
  items: [],
  setCustomer: (customerId) => set({ customerId }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.product.id === product.id);

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        };
      }

      return { items: [...state.items, { product, quantity: 1 }] };
    }),
  decrementItem: (productId) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    })),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    })),
  clear: () => set({ items: [], customerId: null, paymentMethod: "cash" }),
}));

export function getCartTotals(items: CartItem[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * taxRate;

  return {
    subtotal,
    tax,
    total: subtotal + tax,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
