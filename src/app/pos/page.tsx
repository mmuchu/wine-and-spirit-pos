 // src/app/pos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { Product, CartItem } from "@/lib/types";
import { shiftService } from "@/lib/services/shiftService";
import { offlineService } from "@/lib/services/offlineService";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";

export default function POSPage() {
  const supabase = createClient();
  const { organizationId, loading: orgLoading, isLicenseValid } = useOrganization();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa">("cash");
  const [cashReceived, setCashReceived] = useState("");
  
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  
  const [currentShift, setCurrentShift] = useState<any>(null);

  const [vatEnabled, setVatEnabled] = useState(true);
  const [shopName, setShopName] = useState("KENYAN SPIRIT");
  const [shopAddress, setShopAddress] = useState("Nairobi, Kenya");
  const [shopPhone, setShopPhone] = useState("");

  const [isOnline, setIsOnline] = useState(offlineService.isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 1. Main Loader Effect
  useEffect(() => {
    if (orgLoading) return;
    if (!organizationId) { setLoading(false); return; }
    loadInitialData(organizationId);

    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timeout);
  }, [organizationId, orgLoading]);

  // 2. Network Listeners
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); processOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    updatePendingCount();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [organizationId]);

  // 3. Search Filter
  useEffect(() => {
    if (searchTerm.trim() === "") setFilteredProducts([]);
    else setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))));
  }, [searchTerm, products]);

  // --- DATA LOADERS ---
  const loadInitialData = async (orgId: string) => {
    setLoading(true);
    try {
      await Promise.all([fetchProducts(orgId), fetchSettings(orgId), fetchActiveShift(orgId)]);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const fetchProducts = async (orgId: string) => {
    const { data, error } = await supabase.from("products").select("id, name, price, stock, sku, category_id, is_active, cost_price").eq("organization_id", orgId).eq("is_active", true).order("name");
    if (error) console.error(error);
    else setProducts(data || []);
  };

  const fetchSettings = async (orgId: string) => {
    const { data } = await supabase.from('settings').select('*').eq('organization_id', orgId).maybeSingle();
    if (data) {
      setVatEnabled(data.vat_enabled ?? true);
      setShopName(data.shop_name || "KENYAN SPIRIT");
      setShopAddress(data.address || "Nairobi, Kenya");
      setShopPhone(data.phone || "");
    }
  };

  const fetchActiveShift = async (orgId: string) => {
    const shift = await shiftService.getCurrentShift(orgId);
    setCurrentShift(shift);
  };

  const updatePendingCount = () => setPendingCount(offlineService.getQueue().length);

  const processOfflineQueue = async () => {
    if (!organizationId) return;
    const result = await offlineService.syncQueue(supabase, organizationId);
    updatePendingCount();
    if (result.synced > 0) fetchProducts(organizationId);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 } as CartItem];
    });
    setSearchTerm("");
    setFilteredProducts([]);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) setCart(prev => prev.filter(item => item.id !== id));
    else setCart(prev => prev.map(item => (item.id === id ? { ...item, quantity } : item)));
  };

  // --- CALCULATIONS ---
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = vatEnabled ? subtotal * 0.16 : 0;
  const total = subtotal + tax;
  const change = parseFloat(cashReceived) - total;

  // --- SALE HANDLER ---
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (!currentShift) { alert("No Active Shift."); return; }
    if (!organizationId) { alert("Configuration Error."); return; }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const salePayload = {
        organization_id: organizationId, user_id: user?.id, total_amount: total, subtotal, tax_amount: tax, payment_method: paymentMethod, status: "completed", shift_id: currentShift.id,
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, cost_price: item.cost_price || 0, quantity: item.quantity })),
      };

      let savedSale: any;
      if (isOnline) {
        const { data, error } = await supabase.from("sales").insert(salePayload).select().single();
        if (error) throw error;
        savedSale = data;
        for (const item of cart) {
          const product = products.find(p => p.id === item.id);
          if (product) await supabase.from("products").update({ stock: product.stock - item.quantity }).eq("id", item.id);
        }
        fetchProducts(organizationId);
      } else {
        savedSale = offlineService.queueSale(salePayload);
        setProducts(prev => prev.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          return inCart ? { ...p, stock: p.stock - inCart.quantity } : p;
        }));
        alert("OFFLINE. Sale saved locally.");
      }

      setLastSale({ ...savedSale, date: new Date().toISOString(), shop_name: shopName, address: shopAddress, phone: shopPhone });
      setIsReceiptModalOpen(true);
      setCart([]);
      setCashReceived("");
      updatePendingCount();
    } catch (err: any) { alert(`Error: ${err.message}`); } 
    finally { setProcessing(false); }
  };

  const handleBarcodeScan = (code: string) => { setSearchTerm(code); setIsScannerOpen(false); };

  // --- RENDER ---

  // 1. LICENSE BLOCKER
  if (!orgLoading && !isLicenseValid) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50 p-8">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-700">Subscription Expired</h1>
          <p className="text-gray-600 mt-2 mb-6">Access locked due to expiry. Please contact admin.</p>
          <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-200">Back</button>
        </div>
      </div>
    );
  }

  // 2. Loading / Config Errors
  if (orgLoading) return <div className="p-8">Initializing...</div>;
  if (!organizationId) return <div className="p-8 text-center text-red-600 font-bold">Configuration Error: No Organization ID.</div>;
  if (loading) return <div className="p-8">Loading POS...</div>;
  
  // 3. Shift Check
  if (!currentShift) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100 space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">No Active Shift</h2>
        <p className="text-gray-500">You must start a shift to make sales.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      {/* OFFLINE BANNERS */}
      {!isOnline && <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white text-center py-2 z-[100] font-bold text-sm print:hidden">⚠️ OFFLINE MODE</div>}
      {isOnline && pendingCount > 0 && <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 z-[100] font-bold text-sm print:hidden">🔄 Syncing {pendingCount} sales...</div>}

      {/* Left Side */}
      <div className="flex-1 flex flex-col overflow-hidden relative pt-8">
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Sales Terminal</h1>
        </div>
        
        {/* Search & Scanner */}
        <div className="p-4 bg-gray-50 border-b flex gap-2 shrink-0">
          <input type="text" placeholder="Search or scan barcode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-white border border-gray-200 rounded-xl text-base" />
          <button onClick={() => setIsScannerOpen(true)} className="p-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors shrink-0" title="Scan Barcode">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
            </svg>
          </button>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 grid grid-cols-2 gap-4 content-start">
           {searchTerm && filteredProducts.length === 0 && <div className="col-span-2 text-center text-gray-400 py-10">No products found.</div>}
           {(searchTerm ? filteredProducts : products).map(product => (
             <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0}
               className={`bg-white rounded-xl border p-4 text-left h-36 flex flex-col justify-between ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-black'}`}>
               <p className="font-bold text-sm">{product.name}</p>
               <div className="flex justify-between items-end">
                 <p className="text-lg font-extrabold">{formatCurrency(product.price)}</p>
                 <span className="text-xs text-gray-500">{product.stock} left</span>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* Right Side: Cart */}
      <div className="w-[400px] bg-white border-l flex flex-col shadow-xl shrink-0">
        <div className="p-4 border-b flex justify-between items-center shrink-0">
           <h2 className="font-bold text-lg">Current Order</h2>
           {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 font-medium">Clear</button>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 && <div className="text-center text-gray-400 py-10">Cart empty</div>}
          {cart.map(item => (
            <div key={item.id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
              <div className="flex-1"><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-gray-500">{formatCurrency(item.price)}</p></div>
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-gray-200 font-bold text-xs">-</button>
              <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-gray-200 font-bold text-xs">+</button>
              <span className="font-bold text-sm w-16 text-right">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        
        {/* Totals */}
        <div className="p-4 border-t space-y-3 bg-white shrink-0">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          {vatEnabled && <div className="flex justify-between text-sm text-gray-500"><span>VAT (16%)</span><span>{formatCurrency(tax)}</span></div>}
          <div className="flex justify-between font-extrabold text-xl border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
          
          <div className="flex gap-2">
             <button onClick={() => setPaymentMethod("cash")} className={`flex-1 py-2 rounded border-2 font-bold ${paymentMethod === 'cash' ? 'bg-black text-white' : 'bg-white'}`}>Cash</button>
             <button onClick={() => setPaymentMethod("mpesa")} className={`flex-1 py-2 rounded border-2 font-bold ${paymentMethod === 'mpesa' ? 'bg-green-600 text-white' : 'bg-white'}`}>M-Pesa</button>
          </div>

          {paymentMethod === 'cash' && (
             <input type="number" placeholder="Cash Received" value={cashReceived} onChange={e => setCashReceived(e.target.value)} className="w-full p-2 border rounded text-right font-bold" />
          )}

          <button onClick={handleCompleteSale} disabled={processing || cart.length === 0} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold disabled:bg-gray-300">
            {processing ? "Processing..." : "Charge " + formatCurrency(total)}
          </button>
        </div>
      </div>

      {/* Modals */}
      {lastSale && <ReceiptModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} saleData={lastSale} />}
      {isScannerOpen && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScannerOpen(false)} />}
    </div>
  );
}