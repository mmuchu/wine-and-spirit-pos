 // src/app/pos/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product, CartItem } from "@/lib/types";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";

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
  
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  
  const justAddedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, organization_id, category_id, name, price, sku, stock, image_url, is_active, categories ( name )")
          .eq("is_active", true)
          .order("name", { ascending: true });
        
        if (error) throw error;
        
        const list = (data || []).map((item) => ({ 
          ...item, 
          price: Number(item.price) 
        })) as Product[];
        
        setProducts(list);
      } catch (error) {
        setToast({ message: "Failed to load products", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [supabase]);

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

  useEffect(() => {
    return () => {
      if (justAddedTimeout.current) clearTimeout(justAddedTimeout.current);
    };
  }, []);

  // Inventory Update
  const updateInventory = async (items: CartItem[]) => {
    try {
      const updates = items.map((item) => 
        supabase.rpc('decrement_stock', { 
          product_id: item.id, 
          qty: item.quantity 
        })
      );
      await Promise.all(updates);
      
      const { data } = await supabase
        .from("products")
        .select("id, stock")
        .in('id', items.map(i => i.id));
        
      if (data) {
        setProducts(prev => prev.map(p => {
          const updated = data.find(d => d.id === p.id);
          return updated ? { ...p, stock: updated.stock } : p;
        }));
      }
    } catch (error) {
      console.error("Inventory update failed:", error);
    }
  };

  // Payment Success
  const handlePaymentSuccess = async (method: string, transactionRef?: string, phone?: string) => {
    setIsPaymentOpen(false);
    
    if (!cart.length) {
      showToast("Cannot complete an empty sale.", "error");
      return;
    }

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
      };

      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert(saleRecord)
        .select("id")
        .single();

      if (saleError) throw saleError;
      
      const saleId = saleData.id;

      const { error: paymentError } = await supabase.from("payments").insert({
        sale_id: saleId,
        amount: total,
        method: method,
        transaction_ref: transactionRef ?? null,
        phone_number: method === "M-Pesa" ? (phone ?? null) : null,
      });

      if (paymentError) throw paymentError;
      
      await updateInventory(cart);

      const receiptData = {
        id: saleId,
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

      if (method === "M-Pesa") {
        showToast("STK Push sent. Sale pending confirmation.", "success");
      } else {
        showToast(`Sale completed successfully!`, "success");
      }

    } catch (error) {
      const err = error as any;
      const message = err?.message || err?.details || "Failed to complete sale";
      showToast(message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
            toast.type === "success" ? "bg-emerald-500" : "bg-destructive"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
        <section className="flex-1 min-w-0 pb-20 lg:pb-0">
          <ProductGrid
            products={products}
            isLoading={loading}
            onAdd={addToCart}
            justAddedId={justAdded}
          />
        </section>

        {/* FIX: Strict Flex Column Layout for Sidebar */}
        <section className="w-full lg:w-96 flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]">
          
          {/* Tax Toggle - Fixed Height */}
          <div className="bg-card border rounded-lg p-3 flex items-center justify-between shrink-0">
            <div>
              <p className="font-medium text-sm">VAT (16%)</p>
              <p className="text-xs text-muted-foreground">
                {isTaxEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <button
              onClick={() => setIsTaxEnabled(!isTaxEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isTaxEnabled ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isTaxEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* CartPanel Wrapper - Fills remaining height and provides flex context */}
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
        onStkSent={() => showToast("STK Push sent! Check your phone.", "success")}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        saleData={lastSaleData}
      />
    </div>
  );
}