 // src/app/pos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { Product, CartItem } from "@/lib/types";
import { auditService } from "@/lib/services/auditService";
import { shiftService } from "@/lib/services/shiftService";
import { offlineService } from "@/lib/services/offlineService";

export default function POSPage() {
  const supabase = createClient();
  const { organizationId, loading: orgLoading } = useOrganization();

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

  // 1. Main Loader Effect
  useEffect(() => {
    // If context loading, wait
    if (orgLoading) return;

    // If no ID, stop loading
    if (!organizationId) {
      setLoading(false);
      return;
    }

    // Load data
    loadInitialData(organizationId);

    // SAFETY TIMEOUT: Never load forever
    const timeout = setTimeout(() => {
      console.warn("POS Load Timeout - forcing finish");
      setLoading(false);
    }, 5000);

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
    if (searchTerm.trim() === "") {
      setFilteredProducts([]);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredProducts(
        products.filter(p => p.name.toLowerCase().includes(lower) || (p.sku && p.sku.toLowerCase().includes(lower)))
      );
    }
  }, [searchTerm, products]);

  // --- DATA LOADERS ---

  const loadInitialData = async (orgId: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProducts(orgId),
        fetchSettings(orgId),
        fetchActiveShift(orgId)
      ]);
    } catch (err) {
      console.error("Initial Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock, sku, category_id, is_active")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchSettings = async (orgId: string) => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('organization_id', orgId).maybeSingle();
      if (data) {
        setVatEnabled(data.vat_enabled ?? true);
        setShopName(data.shop_name || "KENYAN SPIRIT");
        setShopAddress(data.address || "Nairobi, Kenya");
        setShopPhone(data.phone || "");
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const fetchActiveShift = async (orgId: string) => {
    try {
      const shift = await shiftService.getCurrentShift(orgId);
      setCurrentShift(shift);
    } catch (err) {
      console.error("Error checking shift", err);
    }
  };

  const updatePendingCount = () => setPendingCount(offlineService.getQueue().length);

  const processOfflineQueue = async () => {
    if (!organizationId) return;
    const result = await offlineService.syncQueue(supabase, organizationId);
    updatePendingCount();
    if (result.synced > 0) fetchProducts(organizationId);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 } as CartItem];
    });
    setSearchTerm("");
    setFilteredProducts([]);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) setCart((prev) => prev.filter((item) => item.id !== id));
    else setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
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

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const salePayload = {
        organization_id: organizationId,
        user_id: user?.id,
        total_amount: total,
        subtotal: subtotal,
        tax_amount: tax,
        payment_method: paymentMethod,
        status: "completed",
        shift_id: currentShift.id,
        items: cart.map((item) => ({
          id: item.id, name: item.name, price: item.price, cost_price: item.cost_price || 0, quantity: item.quantity,
        })),
      };

      let savedSale: any;

      if (isOnline) {
        const { data, error } = await supabase.from("sales").insert(salePayload).select().single();
        if (error) throw error;
        savedSale = data;

        for (const item of cart) {
          const product = products.find((p) => p.id === item.id);
          if (product) await supabase.from("products").update({ stock: product.stock - item.quantity }).eq("id", item.id);
        }
        fetchProducts(organizationId);
      } else {
        savedSale = offlineService.queueSale({ organization_id: organizationId, ...salePayload });
        setProducts(prev => prev.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          if (inCart) return { ...p, stock: p.stock - inCart.quantity };
          return p;
        }));
        alert("OFFLINE. Sale saved locally.");
      }

      setLastSale({ ...savedSale, date: new Date().toISOString(), shop_name: shopName, address: shopAddress, phone: shopPhone });
      setIsReceiptModalOpen(true);
      setCart([]);
      setCashReceived("");
      updatePendingCount();

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // --- RENDER ---
  if (orgLoading) return <div className="p-8">Initializing...</div>;
  if (!organizationId) return <div className="p-8 text-center text-red-600 font-bold">Configuration Error: No Organization ID.</div>;
  if (loading) return <div className="p-8">Loading POS...</div>;
  
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
      {!isOnline && <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white text-center py-2 z-[100] font-bold text-sm">⚠️ OFFLINE MODE</div>}
      {isOnline && pendingCount > 0 && <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 z-[100] font-bold text-sm">🔄 Syncing {pendingCount} sales...</div>}

      {/* Left Side */}
      <div className="flex-1 flex flex-col overflow-hidden relative pt-8">
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Sales Terminal</h1>
        </div>
        <div className="p-4 bg-gray-50 border-b">
          <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-4 bg-white border rounded-xl" />
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 grid grid-cols-2 gap-4">
           {searchTerm && filteredProducts.length === 0 ? <div className="col-span-2 text-center text-gray-400">No products found.</div> : null}
           {(searchTerm ? filteredProducts : products).map(product => (
             <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0}
               className={`bg-white rounded-xl border p-4 text-left h-36 flex flex-col justify-between ${product.stock <= 0 ? 'opacity-50' : 'hover:border-black'}`}>
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
      <div className="w-[400px] bg-white border-l flex flex-col shadow-xl">
        <div className="p-4 border-b"><h2 className="font-bold text-lg">Current Order ({cart.length})</h2></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 && <div className="text-center text-gray-400 py-10">Cart empty</div>}
          {cart.map(item => (
            <div key={item.id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
              <div className="flex-1"><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-gray-500">{formatCurrency(item.price)}</p></div>
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-gray-200 font-bold text-xs">-</button>
              <span className="font-bold text-sm">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-gray-200 font-bold text-xs">+</button>
              <span className="font-bold text-sm w-16 text-right">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          {vatEnabled && <div className="flex justify-between text-sm text-gray-500"><span>VAT</span><span>{formatCurrency(tax)}</span></div>}
          <div className="flex justify-between font-extrabold text-xl border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
          
          <div className="flex gap-2">
             <button onClick={() => setPaymentMethod("cash")} className={`flex-1 py-2 rounded border-2 font-bold ${paymentMethod === 'cash' ? 'bg-black text-white' : 'bg-white'}`}>Cash</button>
             <button onClick={() => setPaymentMethod("mpesa")} className={`flex-1 py-2 rounded border-2 font-bold ${paymentMethod === 'mpesa' ? 'bg-green-600 text-white' : 'bg-white'}`}>M-Pesa</button>
          </div>

          {paymentMethod === 'cash' && (
             <input type="number" placeholder="Cash Received" value={cashReceived} onChange={e => setCashReceived(e.target.value)} className="w-full p-2 border rounded text-right font-bold" />
          )}

          <button onClick={handleCompleteSale} disabled={processing || cart.length === 0} 
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold disabled:bg-gray-300">
            {processing ? "Processing..." : "Charge " + formatCurrency(total)}
          </button>
        </div>
      </div>

      {lastSale && <ReceiptModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} saleData={lastSale} />}
    </div>
  );
}