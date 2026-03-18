 // src/app/pos/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product, CartItem } from "@/lib/types";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { QuotationModal } from "@/components/pos/QuotationModal";
import { offlineService } from "@/lib/services/offlineService";
import { quotationService } from "@/lib/services/quotationService";
import { useOrganization } from "@/lib/context/OrganizationContext";

const TAX_RATE = 0.16;

export default function POSPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isTaxEnabled, setIsTaxEnabled] = useState(true);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const justAddedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organizationId) { loadLocalProducts(); syncData(); }
    const handleOnline = () => { setIsOnline(true); showToast("Back Online!", "success"); offlineService.syncPendingSales(); syncData(); };
    const handleOffline = () => { setIsOnline(false); showToast("Offline Mode.", "error"); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    searchInputRef.current?.focus();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [organizationId]);

  const loadLocalProducts = async () => { try { const p = await offlineService.getLocalProducts(); if (p.length) { setProducts(p); setFilteredProducts(p); setLoading(false); } } catch (e) { console.error(e); } };
  const syncData = async () => { try { await offlineService.syncProducts(); const p = await offlineService.getLocalProducts(); setProducts(p); setFilteredProducts(p); setLoading(false); setPendingCount(await offlineService.getPendingCount()); } catch (e) { console.error(e); } };

  useEffect(() => {
    if (searchTerm.trim() === "") setFilteredProducts(products);
    else setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))));
  }, [searchTerm, products]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); if (filteredProducts.length === 1) { addToCart(filteredProducts[0]); setSearchTerm(""); searchInputRef.current?.focus(); } else if (filteredProducts.length === 0) showToast("Not found", "error"); } };
  
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = isTaxEnabled ? subtotal * TAX_RATE : 0;
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = useCallback((product: Product) => { setCart((prev) => { const ex = prev.find(i => i.id === product.id); if (ex) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i); return [...prev, { ...product, quantity: 1 }]; }); if (justAddedTimeout.current) clearTimeout(justAddedTimeout.current); setJustAdded(product.id); justAddedTimeout.current = setTimeout(() => setJustAdded(null), 300); }, []);
  const updateQuantity = useCallback((id: string, delta: number) => { setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0)); }, []);
  const removeFromCart = useCallback((id: string) => setCart(prev => prev.filter(i => i.id !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const showToast = useCallback((message: string, type: "success" | "error") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); }, []);

  const handlePaymentSuccess = async (method: string) => {
    setIsPaymentOpen(false);
    if (!cart.length || !organizationId) return;
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const record = { organization_id: organizationId, user_id: user?.id, total_amount: total, tax_amount: tax, subtotal_amount: subtotal, subtotal: subtotal, items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, cost_price: i.cost_price || 0, quantity: i.quantity })), payment_method: method, status: method === "M-Pesa" ? "pending" : "completed", created_at: new Date().toISOString() };
      
      const res = await offlineService.processSale(record);
      setFilteredProducts(await offlineService.getLocalProducts());
      setPendingCount(await offlineService.getPendingCount());
      clearCart(); setLastSaleData({ id: res.id, items: cart, total, subtotal, tax, paymentMethod: method, date: new Date().toISOString() });
      setIsReceiptOpen(true);
      showToast(res.offline ? "Saved Offline" : "Sale Completed!", "success");
    } catch (e: any) { showToast(e.message || "Error", "error"); } finally { setIsProcessing(false); }
  };

  const handleSaveQuote = async () => { if (!cart.length || !organizationId) return; const name = prompt("Customer Name:"); try { await quotationService.saveQuotation({ organization_id: organizationId, items: cart, total_amount: total, customer_name: name || null, status: 'pending' }); showToast("Quote Saved!", "success"); clearCart(); } catch (e: any) { showToast("Error: " + e.message, "error"); } };
  const handleLoadQuote = (q: any) => { if (cart.length > 0 && !confirm("Clear current cart?")) return; setCart(q.items.map((i: any) => ({ ...i, quantity: i.quantity || 1 }))); showToast("Quote Loaded", "success"); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${toast.type === "success" ? "bg-emerald-500" : "bg-destructive"}`}>{toast.message}</div>}
      {!isOnline && <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-black text-center py-2 text-sm font-bold">OFFLINE MODE ({pendingCount} pending)</div>}
      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 pt-10">
        <section className="flex-1 min-w-0 pb-20 lg:pb-0 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
              <input ref={searchInputRef} type="text" placeholder="Search or Scan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearchKeyDown} className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm" />
            </div>
            <button onClick={() => setIsQuoteModalOpen(true)} className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-gray-50">Quotes</button>
          </div>
          <ProductGrid products={filteredProducts} isLoading={loading} onAdd={addToCart} justAddedId={justAdded} />
        </section>
        <section className="w-full lg:w-96 flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)]">
          <div className="bg-card border rounded-lg p-3 shrink-0 space-y-3">
            <div className="flex items-center justify-between"><p className="font-medium text-sm">VAT (16%)</p><button onClick={() => setIsTaxEnabled(!isTaxEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isTaxEnabled ? "bg-green-600" : "bg-gray-300"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTaxEnabled ? "translate-x-6" : "translate-x-1"}`} /></button></div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <CartPanel cart={cart} itemCount={itemCount} subtotal={subtotal} tax={tax} total={total} taxRate={isTaxEnabled ? 16 : 0} isProcessing={isProcessing} onUpdateQty={updateQuantity} onRemove={removeFromCart} onClear={clearCart} onCheckout={() => { if (cart.length === 0) return; setIsPaymentOpen(true); }} />
            {cart.length > 0 && (<div className="mt-2 flex gap-2"><button onClick={handleSaveQuote} className="flex-1 py-2 border rounded-lg text-xs font-bold hover:bg-gray-50">Save as Quote</button></div>)}
          </div>
        </section>
      </div>
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} total={total} items={cart} onComplete={handlePaymentSuccess} onStkSent={() => showToast("STK Sent", "success")} />
      <ReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} saleData={lastSaleData} />
      <QuotationModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} onLoad={handleLoadQuote} organizationId={organizationId} />
    </div>
  );
}