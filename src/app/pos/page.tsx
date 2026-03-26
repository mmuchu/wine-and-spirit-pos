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

  // Network Status
  const [isOnline, setIsOnline] = useState(offlineService.isOnline());
  const [pendingCount, setPendingCount] = useState(0);

  // --- EFFECTS ---

  // 1. Wait for Context, then Load Data
  useEffect(() => {
    // If context is still loading, wait
    if (orgLoading) return;

    // If context loaded but NO organization ID, stop loading and show error
    if (!organizationId) {
      setLoading(false);
      return;
    }

    // If we have ID, load everything
    loadInitialData(organizationId);

  }, [organizationId, orgLoading]);

  // 2. Network Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };
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
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            (p.sku && p.sku.toLowerCase().includes(lower))
        )
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

  // --- HELPERS ---

  const updatePendingCount = () => {
    const queue = offlineService.getQueue();
    setPendingCount(queue.length);
  };

  const processOfflineQueue = async () => {
    if (!organizationId) return;
    const result = await offlineService.syncQueue(supabase, organizationId);
    updatePendingCount();
    if (result.synced > 0) {
      fetchProducts(organizationId);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 } as CartItem];
    });
    setSearchTerm("");
    setFilteredProducts([]);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== id));
    } else {
      setCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
    }
  };

  // --- CALCULATIONS ---

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = vatEnabled ? subtotal * 0.16 : 0;
  const total = subtotal + tax;
  const change = parseFloat(cashReceived) - total;

  // --- SALE HANDLERS ---

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    if (!currentShift) {
      alert("No Active Shift. Please start a shift first.");
      return;
    }

    if (isOnline) {
      for (const item of cart) {
        const product = products.find((p) => p.id === item.id);
        if (product && product.stock < item.quantity) {
          alert(`Insufficient stock for "${item.name}".`);
          return;
        }
      }
    }

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
          id: item.id,
          name: item.name,
          price: item.price,
          cost_price: item.cost_price || 0,
          quantity: item.quantity,
        })),
      };

      let savedSale: any;

      if (isOnline) {
        const { data, error } = await supabase
          .from("sales")
          .insert(salePayload)
          .select()
          .single();

        if (error) throw error;
        savedSale = data;

        for (const item of cart) {
          const product = products.find((p) => p.id === item.id);
          if (product) {
            await supabase
              .from("products")
              .update({ stock: product.stock - item.quantity })
              .eq("id", item.id);
          }
        }
        
        auditService.log("SALE_ONLINE", `Sold ${cart.length} items for ${formatCurrency(total)}`, organizationId);
        fetchProducts(organizationId);

      } else {
        savedSale = offlineService.queueSale({
          organization_id: organizationId,
          ...salePayload
        });

        setProducts(prev => prev.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          if (inCart) {
            return { ...p, stock: p.stock - inCart.quantity };
          }
          return p;
        }));
        
        alert("You are OFFLINE. Sale saved locally.");
        auditService.log("SALE_OFFLINE", `Queued offline sale`, organizationId);
      }

      setLastSale({ 
        ...savedSale, 
        date: new Date().toISOString(),
        shop_name: shopName,
        address: shopAddress,
        phone: shopPhone
      });
      
      setIsReceiptModalOpen(true);
      setCart([]);
      setCashReceived("");
      updatePendingCount();

    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // --- RENDER ---

  if (orgLoading) return <div className="p-8">Initializing...</div>;
  
  if (!organizationId) return (
    <div className="p-8 text-center space-y-4">
      <h2 className="text-xl font-bold text-red-600">Configuration Error</h2>
      <p className="text-gray-500">Organization context missing. Please check setup.</p>
    </div>
  );

  if (loading) return <div className="p-8">Loading POS...</div>;

  if (!currentShift && !loading) {
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
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white text-center py-2 z-[100] font-bold text-sm shadow-lg">
          ⚠️ YOU ARE OFFLINE. Sales will be saved locally. ({pendingCount} pending)
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 z-[100] font-bold text-sm shadow-lg">
          🔄 Syncing {pendingCount} pending sales...
        </div>
      )}

      {/* Left Side: Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden relative pt-8">
        
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sales Terminal</h1>
          <span className="px-2 py-1 text-[10px] bg-green-100 text-green-700 rounded font-bold uppercase">
            Shift Active
          </span>
        </div>

        <div className="p-4 bg-gray-50 border-b">
          <input
            type="text"
            placeholder="Search products by name or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-4 bg-white border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-black focus:border-transparent transition shadow-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {searchTerm && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 p-6">
              {filteredProducts.map(product => (
                 <button
                   key={product.id}
                   onClick={() => addToCart(product)}
                   disabled={product.stock <= 0}
                   className={`group relative bg-white rounded-xl border text-left h-36 flex flex-col justify-between overflow-hidden ${
                     product.stock <= 0 
                       ? "opacity-50 cursor-not-allowed bg-gray-50" 
                       : "hover:border-black hover:shadow-lg"
                   }`}
                 >
                   <div className="p-4 flex-1 flex flex-col justify-between">
                     <p className="font-bold text-sm text-gray-800 line-clamp-2">{product.name}</p>
                     <p className="text-lg font-extrabold text-gray-900">{formatCurrency(product.price)}</p>
                   </div>
                 </button>
              ))}
            </div>
          ) : searchTerm ? (
             <div className="p-8 text-center text-gray-400">No products found.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-6">
              {products.map(product => (
                 <button
                   key={product.id}
                   onClick={() => addToCart(product)}
                   disabled={product.stock <= 0}
                   className={`group relative bg-white rounded-xl border text-left h-36 flex flex-col justify-between overflow-hidden ${
                     product.stock <= 0 
                       ? "opacity-50 cursor-not-allowed bg-gray-50" 
                       : "hover:border-black hover:shadow-lg"
                   }`}
                 >
                   <div className="p-4 flex-1 flex flex-col justify-between">
                     <p className="font-bold text-sm text-gray-800 line-clamp-2">{product.name}</p>
                     <div className="flex items-end justify-between mt-2">
                       <p className="text-lg font-extrabold text-gray-900">{formatCurrency(product.price)}</p>
                       <span className="text-xs text-gray-500">{product.stock} in stock</span>
                     </div>
                   </div>
                 </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Cart */}
      <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col h-screen shadow-2xl">
        
        <div className="px-6 py-5 border-b border-gray-100 bg-white shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg text-gray-900">Current Order</h2>
              <p className="text-xs text-gray-400 mt-0.5">{cart.length} items in cart</p>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs font-medium text-red-500">
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-3">
                <p className="font-medium">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm border flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                    className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs"
                  >-</button>
                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                    className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs"
                  >+</button>
                </div>
                <div className="w-20 text-right">
                  <p className="font-bold text-sm">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 bg-white p-6 space-y-4 shrink-0 mt-auto">
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            
            {vatEnabled && (
              <div className="flex justify-between text-gray-500">
                <span>VAT (16%)</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t-2 border-dashed pt-3 mt-2">
              <span className="text-xl font-extrabold text-gray-900">Total</span>
              <span className="text-2xl font-extrabold text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={`py-3 rounded-lg font-bold text-sm border-2 transition-all ${
                paymentMethod === "cash" 
                  ? "bg-black text-white border-black" 
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              Cash
            </button>
            <button
              onClick={() => setPaymentMethod("mpesa")}
              className={`py-3 rounded-lg font-bold text-sm border-2 transition-all ${
                paymentMethod === "mpesa" 
                  ? "bg-green-600 text-white border-green-600" 
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              M-Pesa
            </button>
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-2 pt-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Ksh</span>
                <input
                  type="number"
                  placeholder="Enter amount received"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-right text-lg font-bold focus:ring-2 focus:ring-black"
                />
              </div>
              
              {!isNaN(change) && change > 0 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                  <span className="text-sm text-green-800 font-bold">CHANGE: </span>
                  <span className="text-xl font-extrabold text-green-700">{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleCompleteSale}
            disabled={processing || cart.length === 0}
            className="w-full py-5 bg-red-600 text-white rounded-xl font-extrabold text-lg disabled:bg-gray-200 disabled:text-gray-400 shadow-lg hover:shadow-xl transition-all uppercase tracking-wide"
          >
            {processing ? "Processing..." : "Complete Sale"}
          </button>
        </div>
      </div>

      {lastSale && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          saleData={lastSale}
        />
      )}
    </div>
  );
}