 // src/app/pos/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product, CartItem } from "@/lib/types";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { CustomerModal } from "@/components/pos/CustomerModal";
import { customerService } from "@/lib/services/customerService";
import { offlineService } from "@/lib/services/offlineService";

const TAX_RATE = 0.16;

export default function POSPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  const [isTaxEnabled, setIsTaxEnabled] = useState(true);
  const [isCreditEnabled, setIsCreditEnabled] = useState(false);
  
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Offline State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const justAddedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initData();
    
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Back Online! Syncing...", "success");
      syncData(); 
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("You are Offline.", "error");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Data: Load Local -> Then Sync
  const initData = async () => {
    try {
      // 1. Try loading from local DB first (fast)
      const localProducts = await offlineService.getLocalProducts();
      if (localProducts.length > 0) {
        setProducts(localProducts);
        setLoading(false); // Show local data immediately
      }
      
      // 2. Sync with server
      await syncData();
      
    } catch (err) {
      console.error("Init Error:", err);
      showToast("Failed to load products", "error");
      setLoading(false);
    }
  };

  // Sync Data: Server -> Local DB -> State
  const syncData = async () => {
    try {
      await offlineService.syncProducts(); // This throws if fails
      const freshProducts = await offlineService.getLocalProducts();
      setProducts(freshProducts);
      
      const count = await offlineService.getPendingCount();
      setPendingCount(count);
      
      setLoading(false);
    } catch (err) {
      console.error("Sync Error:", err);
      // If sync fails, we rely on whatever is in local DB.
      // If local DB is empty, we show error.
      const localProducts = await offlineService.getLocalProducts();
      if (localProducts.length === 0) {
         showToast("Could not load products. Check connection/permissions.", "error");
      }
      setLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = isTaxEnabled ? subtotal * TAX_RATE : 0;
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeTaxRate = isTaxEnabled ? 16 : 0;

  // Cart Actions
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
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

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Payment Success
  const handlePaymentSuccess = async (method: string, transactionRef?: string, phone?: string) => {
    setIsPaymentOpen(false);
    if (!cart.length) return;
    setIsProcessing(true);
    try {
      const organizationId = cart[0]?.organization_id;
      const { data: { user } } = await supabase.auth.getUser();
      const saleStatus = method === "M-Pesa" ? "pending" : "completed";

      const saleRecord = {
        organization_id: organizationId,
        user_id: user?.id,
        total_amount: total,
        tax_amount: tax,
        subtotal_amount: subtotal,
        subtotal: subtotal,
        items: cart,
        payment_method: method,
        status: saleStatus,
        created_at: new Date().toISOString()
      };

      // Use Offline Service
      const result = await offlineService.processSale(saleRecord);
      
      // Update UI
      const freshProducts = await offlineService.getLocalProducts();
      setProducts(freshProducts);
      
      const count = await offlineService.getPendingCount();
      setPendingCount(count);

      const receiptData = {
        id: result.id,
        items: cart,
        total: Number(total),
        subtotal: Number(subtotal),
        tax: Number(tax),
        paymentMethod: method,
        date: new Date().toISOString(),
      };

      clearCart();
      setLastSaleData(receiptData);
      setIsReceiptOpen(true);
      
      if (result.offline) {
        showToast("Saved Locally (Offline).", "success");
      } else {
        showToast("Sale Completed!", "success");
      }

    } catch (error) {
      const err = error as any;
      showToast(err?.message || "Failed to process sale", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${toast.type === "success" ? "bg-emerald-500" : "bg-destructive"}`}>
          {toast.message}
        </div>
      )}

      {/* OFFLINE BANNER */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-black text-center py-2 text-sm font-bold print:hidden">
          OFFLINE MODE: Data will sync when connection is restored ({pendingCount} pending)
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 pt-10">
        <section className="flex-1 min-w-0 pb-20 lg:pb-0">
          <ProductGrid
            products={products}
            isLoading={loading}
            onAdd={addToCart}
            justAddedId={justAdded}
          />
        </section>

        <section className="w-full lg:w-96 flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]">
          
          <div className="bg-card border rounded-lg p-3 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">VAT (16%)</p>
                <p className="text-xs text-muted-foreground">{isTaxEnabled ? "Enabled" : "Disabled"}</p>
              </div>
              <button onClick={() => setIsTaxEnabled(!isTaxEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isTaxEnabled ? "bg-green-600" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTaxEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <p className="font-medium text-sm">Allow Credit</p>
                <p className="text-xs text-muted-foreground">{isCreditEnabled ? "On Credit" : "Cash Only"}</p>
              </div>
              <button onClick={() => setIsCreditEnabled(!isCreditEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isCreditEnabled ? "bg-blue-600" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCreditEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <CartPanel
              cart={cart}
              itemCount={itemCount}
              subtotal={subtotal}
              tax={tax}
              total={total}
              taxRate={activeTaxRate}
              isProcessing={isProcessing}
              onUpdateQty={updateQuantity}
              onRemove={removeFromCart}
              onClear={clearCart}
              onCheckout={() => cart.length > 0 && setIsPaymentOpen(true)}
              isCreditMode={isCreditEnabled}
            />
          </div>
        </section>
      </div>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={total}
        items={cart}
        onComplete={handlePaymentSuccess}
        onStkSent={() => showToast("STK Push sent!", "success")}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        saleData={lastSaleData}
      />
    </div>
  );
}