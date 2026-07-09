"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMenuItem, type MenuItem } from "@/data/menu";

const STORAGE_KEY = "ark-cart-v1";

export type CartLine = {
  menuItemId: string;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  itemCount: number;
  subtotalCents: number;
  addItem: (menuItemId: string, quantity?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  getLineDetails: () => Array<CartLine & { item: MenuItem; lineTotalCents: number }>;
};

const CartContext = createContext<CartContextValue | null>(null);

function sanitizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const map = new Map<string, number>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as CartLine).menuItemId;
    const qty = Number((entry as CartLine).quantity);
    if (typeof id !== "string" || !getMenuItem(id)) continue;
    if (!Number.isFinite(qty) || qty < 1) continue;
    map.set(id, Math.min(99, Math.floor(qty)));
  }
  return Array.from(map.entries()).map(([menuItemId, quantity]) => ({
    menuItemId,
    quantity,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(sanitizeLines(JSON.parse(raw)));
    } catch {
      /* private mode / blocked storage / corrupt JSON */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* don't crash UI if storage is blocked */
    }
  }, [lines, ready]);

  const addItem = useCallback((menuItemId: string, quantity = 1) => {
    if (!getMenuItem(menuItemId)) return;
    const addQty = Math.max(1, Math.min(99, Math.floor(quantity)));
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === menuItemId);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === menuItemId
            ? { ...l, quantity: Math.min(99, l.quantity + addQty) }
            : l,
        );
      }
      return [...prev, { menuItemId, quantity: addQty }];
    });
  }, []);

  const setQuantity = useCallback((menuItemId: string, quantity: number) => {
    const qty = Math.floor(quantity);
    setLines((prev) => {
      if (qty < 1) return prev.filter((l) => l.menuItemId !== menuItemId);
      return prev.map((l) =>
        l.menuItemId === menuItemId
          ? { ...l, quantity: Math.min(99, qty) }
          : l,
      );
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const getLineDetails = useCallback(() => {
    return lines
      .map((line) => {
        const item = getMenuItem(line.menuItemId);
        if (!item) return null;
        return {
          ...line,
          item,
          lineTotalCents: item.priceCents * line.quantity,
        };
      })
      .filter(Boolean) as Array<
      CartLine & { item: MenuItem; lineTotalCents: number }
    >;
  }, [lines]);

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  const subtotalCents = useMemo(() => {
    return lines.reduce((sum, l) => {
      const item = getMenuItem(l.menuItemId);
      return sum + (item ? item.priceCents * l.quantity : 0);
    }, 0);
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      ready,
      itemCount,
      subtotalCents,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      getLineDetails,
    }),
    [
      lines,
      ready,
      itemCount,
      subtotalCents,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      getLineDetails,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
