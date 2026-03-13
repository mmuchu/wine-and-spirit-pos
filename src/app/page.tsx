 // src/app/page.tsx
"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { Product, CartItem } from "@/lib/types";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { getCategoryName } from "@/components/pos/utils";

const TAX_RATE = 0.08;
const CART_STORAGE_KEY = "pos-cart";

type ToastType = "success" | "error";

export default function POSDashboard() {
  const { products, isLoading, error, loadFallback } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>("success");

  const justAddedTimeout = useRef<NodeJS.Timeout | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch (err) {
      console.error("Failed to load cart", err);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.error("Failed to save cart", err);
    }
  }, [cart]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (justAddedTimeout.current) clearTimeout(justAddedTimeout.current);
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  // Cart Logic
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      return existing
        ? prev.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...prev, { ...product, quantity: 1 }];
    });
    if (justAddedTimeout.current) clearTimeout(justAddedTimeout.current);
    setJustAdded(product.id);
    justAddedTimeout.current = setTimeout(() => setJustAdded(null), 300);
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(message);
    setToastType(type);
    toastTimeout.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const supabase = createClient();
      const saleItems = cart.map(({ id, name, price, sku, quantity }) => ({
        id, name, price, sku, quantity,
      }));

      const { data, error: rpcError } = await supabase.rpc("complete_sale", {
        p_org_id: cart[0].organization_id,
        p_items: saleItems,
        p_subtotal: subtotal,
        p_tax: tax,
        p_total: total,
      });

      if (rpcError) throw rpcError;

      const saleId = data ? String(data).slice(0, 8) : "unknown";
      showToast(`Sale Complete! ID: ${saleId}`, "success");
      clearCart();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed.";
      showToast(`Error: ${message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Derived State
  const { subtotal, tax, total, itemCount } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return {
      subtotal,
      tax: subtotal * TAX_RATE,
      total: subtotal * (1 + TAX_RATE),
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [cart]);

  const categories = useMemo(() => {
    return [...new Set(products.map((p) => getCategoryName(p)).filter(Boolean))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = !selectedCategory || getCategoryName(p) === selectedCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ===================== HEADER ===================== */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Wine & Spirits</h1>
              <p className="text-xs text-muted-foreground">Point of Sale</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
            </div>
          </div>

          {/* Mobile Indicator */}
          <div className="lg:hidden flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{itemCount} items</span>
          </div>
        </div>
      </header>

      {/* ===================== MAIN LAYOUT ===================== */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
         
        {/* ===== LEFT SIDE: PRODUCTS ===== */}
        <section className="flex-1 lg:w-[60%] space-y-6">
          
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm text-destructive">{error}</span>
              </div>
              <button onClick={loadFallback} className="px-3 py-1 bg-muted rounded text-xs font-medium hover:bg-muted/80">
                Use Demo Data
              </button>
            </div>
          )}

          {/* Product Grid Component */}
          <ProductGrid
            products={filteredProducts}
            isLoading={isLoading}
            onAdd={addToCart}
            justAddedId={justAdded}
          />
        </section>

        {/* ===== RIGHT SIDE: CART ===== */}
        <aside className="lg:w-[40%] lg:sticky lg:top-24 lg:self-start">
          <CartPanel
            cart={cart}
            itemCount={itemCount}
            subtotal={subtotal}
            tax={tax}
            total={total}
            isProcessing={isProcessing}
            onUpdateQty={updateQuantity}
            onRemove={(id) => setCart((prev) => prev.filter((i) => i.id !== id))}
            onClear={clearCart}
            onCheckout={handleCheckout}
          />
        </aside>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all ${
            toastType === "error"
              ? "bg-destructive text-destructive-foreground"
              : "bg-emerald-500 text-white"
          }`}
        >
          {toast}
        </div>
      )}
    </div>
  );
}