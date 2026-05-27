"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAccount } from "wagmi";

export interface CartItem {
  tokenId: string;
  name: string;
  imgUrl?: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  decrease: (tokenId: string) => void;
  remove: (tokenId: string) => void;
  clear: () => void;
  totalQty: number;
  getQty: (tokenId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(address?: string) {
  return `farmaplus-cart-${address ?? "guest"}`;
}

function loadCart(address?: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[], address?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(address), JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [items, setItems] = useState<CartItem[]>([]);

  // Reload cart whenever connected wallet changes
  useEffect(() => {
    setItems(loadCart(address));
  }, [address]);

  // Persist on every change
  useEffect(() => {
    saveCart(items, address);
  }, [items, address]);

  const add = useCallback((item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.tokenId === item.tokenId);
      if (existing) return prev.map((i) => i.tokenId === item.tokenId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const decrease = useCallback((tokenId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.tokenId === tokenId);
      if (!item) return prev;
      if (item.qty <= 1) return prev.filter((i) => i.tokenId !== tokenId);
      return prev.map((i) => i.tokenId === tokenId ? { ...i, qty: i.qty - 1 } : i);
    });
  }, []);

  const remove = useCallback((tokenId: string) => {
    setItems((prev) => prev.filter((i) => i.tokenId !== tokenId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const getQty = useCallback((tokenId: string) => {
    return items.find((i) => i.tokenId === tokenId)?.qty ?? 0;
  }, [items]);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, decrease, remove, clear, totalQty, getQty }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
