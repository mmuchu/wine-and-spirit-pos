 // src/app/pos/page.tsx
"use client";

import { useState, useEffect, useRef } from "react"; 
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { Product, CartItem } from "@/lib/types";
import { shiftService } from "@/lib/services/trackService";
import { offlineService } from "@/lib/services/offlineService";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { auditService } from "@/lib/services/auditService"; 

const round2 = (num: number) => Math.round(num * 100) / 100;

export default function POSPage() {
  const supabase = createClient();
  const { organizationId, loading: orgLoading, isLicenseValid } = useOrganization();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
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

  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Start Shift States
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [startingShift, setStartingShift] = useState(false);

  // Close Shift States
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [closingShift, setClosingShift] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<{ cashSales: number; mpesaSales: number; transactionCount: number; openingCash: number }>({ cashSales: 0, mpesaSales: 0, transactionCount: 0, openingCash: 0 });

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (orgLoading) return;
    if (!organizationId) { setLoading(false); return; }
    loadInitialData(organizationId);
  }, [organizationId, orgLoading]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); processOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    updatePendingCount();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") setFilteredProducts([]);
    else setFilteredProducts(products.filter((p: any) => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ));
  }, [searchTerm, products]);

  const loadInitialData = async (orgId: string) => {
    setLoading(true);
    try {
      await Promise.all([fetchProducts(orgId), fetchSettings(orgId), fetchActiveShift(orgId)]);
    } catch (err: any) {
      // FIX: Log specific error message
      console.error("Initialization error:", err?.message || err);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchProducts = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock, sku, category_id, is_active, cost_price")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name")
        .limit(200);

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Product fetch error:", err?.message || err);
    }
  };

  const fetchSettings = async (orgId: string) => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('organization_id', orgId).maybeSingle();
      if (error) throw error;
      if (data) {
        setVatEnabled(data.vat_enabled ?? true);
        setShopName(data.shop_name || "KENYAN SPIRIT");
        setShopAddress(data.address || "Nairobi, Kenya");
        setShopPhone(data.phone || "");
      }
    } catch (err: any) {
      console.error("Settings fetch error:", err?.message || err);
    }
  };

  const fetchActiveShift = async (orgId: string) => {
    try {
      const shift = await shiftService.getCurrentShift(orgId);
      setCurrentShift(shift);
    } catch (err: any) {
      console.error("Shift fetch error:", err?.message || err);
    }
  };

  const updatePendingCount = () => setPendingCount(offlineService.getQueue().length);

  const processOfflineQueue = async () => {
    if (!organizationId) return;
    const result = await offlineService.syncQueue(supabase, organizationId);
    updatePendingCount();
    if (result.synced > 0) fetchProducts(organizationId);
  };

  const handleStartShift = async () => {
    if (!organizationId) return;
    setStartingShift(true);
    try {
      const cash = parseFloat(openingCash) || 0;
      const shift = await shiftService.startShift(organizationId, cash);
      if (shift) {
        setCurrentShift(shift);
        setShowStartShiftModal(false);
        setOpeningCash("");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to start shift");
    } finally {
      setStartingShift(false);
    }
  };

  const handleBarcodeScan = (code: string) => { setSearchTerm(code); setIsScannerOpen(false); };

  const addToCart = (product: Product) => {
    if (!product.stock || product.stock <= 0) {
      alert(`"${product.name}" is out of stock.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      
      if (currentQty >= product.stock) {
        alert(`Cannot add more "${product.name}". Max stock is ${product.stock}.`);
        return prev; 
      }

      const updatedCart = existing 
        ? prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...prev, { ...product, quantity: 1 } as CartItem];
      
      setTimeout(() => {
        const input = inputRefs.current[product.id];
        if (input) { input.focus(); input.select(); }
      }, 50);

      return updatedCart;
    });
    setSearchTerm("");
    setFilteredProducts([]);
  };

  const updateQuantity = (id: string, quantity: number | string) => {
    const num = typeof quantity === 'string' ? parseInt(quantity) : quantity;
    const product = products.find(p => p.id === id);
    
    if (isNaN(num) || num <= 0) {
      setCart(prev => prev.filter(item => item.id !== id));
      return;
    }

    const maxStock = product?.stock || 0;
    const safeQty = Math.min(num, maxStock);
    setCart(prev => prev.map(item => (item.id === id ? { ...item, quantity: safeQty } : item)));
  };

  const isCartValid = (() => {
    if (cart.length === 0) return false;
    return cart.every(item => {
      const product = products.find(p => p.id === item.id);
      return product && item.quantity <= product.stock;
    });
  })();

  const subtotal = round2(cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0));
  const tax = vatEnabled ? round2(subtotal * 0.16) : 0;
  const total = round2(subtotal + tax);

  const handleCloseShift = async () => {
    if (!currentShift) return;
    setClosingShift(true);
    try {
      const cash = parseFloat(closingCash) || 0;
      const shift = await shiftService.closeShift(currentShift.id, cash);
      if (shift) {
        setCurrentShift(null);
        setShowCloseShiftModal(false);
        setClosingCash("");
        alert("✅ Shift closed successfully!");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to close shift");
    } finally {
      setClosingShift(false);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (!currentShift) { alert("No Active Shift."); return; }
    if (!organizationId) { alert("Configuration Error."); return; }
    
    for (const item of cart) {
      const product = products.find(p => p.id === item.id);
      if (!product) { alert(`Error: Product ${item.name} not found.`); return; }
      if (item.quantity > product.stock) { 
        alert(`Stock changed! "${item.name}" now only has ${product.stock} available. Please update cart.`); 
        setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: product.stock} : i));
        return; 
      }
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let savedSale: any;

      if (isOnline) {
        const receiptItems = cart.map((item: any) => ({ 
          id: item.id, name: item.name, price: item.price, cost_price: item.cost_price || 0, quantity: item.quantity 
        }));

        const rpcItems = cart.map((item: any) => ({ 
          product_id: item.id, 
          quantity: item.quantity 
        }));

        const { data, error } = await supabase.rpc('process_pos_sale', {
          p_org_id: organizationId,
          p_user_id: user.id,
          p_shift_id: currentShift.id,     
          p_items_json: receiptItems,      
          p_items: rpcItems,
          p_payment_method: paymentMethod, 
          p_tax_amount: tax,              
          p_subtotal: subtotal            
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Sale failed");

        savedSale = {
          id: data.sale_id,
          total_amount: data.total, 
          subtotal: subtotal,
          tax_amount: tax,
          payment_method: paymentMethod,
          shift_id: currentShift.id,
          items: receiptItems 
        };
        
        fetchProducts(organizationId); 
        
      } else {
        const salePayload = {
          organization_id: organizationId, user_id: user?.id, total_amount: total, subtotal, tax_amount: tax, payment_method: paymentMethod, status: "completed", shift_id: currentShift.id,
          items: cart.map((item: any) => ({ id: item.id, name: item.name, price: item.price, cost_price: item.cost_price || 0, quantity: item.quantity })),
        };
        savedSale = offlineService.queueSale(salePayload);
        setProducts(prev => prev.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          return inCart ? { ...p, stock: Math.max(0, p.stock - inCart.quantity) } : p;
        }));
        alert("⚠️ OFFLINE. Sale saved locally.");
      }

      setLastSale({ ...savedSale, date: new Date().toISOString(), shop_name: shopName, address: shopAddress, phone: shopPhone });
      setIsReceiptModalOpen(true);
      
      await auditService.log(
        'SALE_COMPLETED', 
        `Total: Ksh ${savedSale.total_amount} via ${paymentMethod.toUpperCase()}`, 
        organizationId, 
        { total: savedSale.total_amount, method: paymentMethod, items_count: cart.length, sale_id: savedSale?.id }
      );

      setCart([]);
      setCashReceived("");
      updatePendingCount();
    } catch (err: any) { 
      console.error(err);
      if (err.message?.includes('Insufficient stock')) alert(`❌ Stock Error: ${err.message}`);
      else alert(`Error: ${err.message}`);
    } finally { 
      setProcessing(false); 
    }
  };

  if (!orgLoading && !isLicenseValid) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-700">Subscription Expired</h1>
        <p className="text-gray-600 mt-2">Please contact admin to renew.</p>
      </div>
    );
  }
  if (orgLoading) return <div className="p-8">Initializing...</div>;
  if (!organizationId) return <div className="p-8 text-center text-red-600 font-bold">Configuration Error.</div>;
  if (loading) return <div className="p-8">Loading POS...</div>;
  
  if (!currentShift) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        {showStartShiftModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStartShiftModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Start Shift</h2>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Opening Cash (Ksh)</label>
                <input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="0.00" className="w-full p-2.5 border border-gray-300 rounded-lg text-lg text-right font-bold focus:ring-2 focus:ring-black focus:border-black outline-none" autoFocus />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowStartShiftModal(false)} className="flex-1 py-2.5 border-2 border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleStartShift} disabled={startingShift} className="flex-1 py-2.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 disabled:bg-gray-400">{startingShift ? "Starting..." : "Start Shift"}</button>
              </div>
            </div>
          </div>
        )}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg></div>
          <div><h2 className="text-2xl font-bold text-gray-800">No Active Shift</h2><p className="text-gray-500 mt-1">Start a shift to begin selling</p></div>
          <button onClick={() => setShowStartShiftModal(true)} className="px-6 py-3 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg">Start Shift</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      {!isOnline && <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white text-center py-1.5 z-[100] font-bold text-sm print:hidden">⚠️ OFFLINE MODE</div>}
      {isOnline && pendingCount > 0 && <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-1.5 z-[100] font-bold text-sm print:hidden">🔄 Syncing {pendingCount} sales...</div>}

      <div className="flex-1 flex flex-col overflow-hidden relative pt-8">
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 sticky top-0 z-10 flex justify-between items-center shrink-0">
          <h1 className="text-sm font-bold text-gray-900">Sales Terminal</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                if (currentShift) {
                  const summary = await shiftService.getShiftSummary(currentShift.id);
                  const opening = await shiftService.getShiftOpeningCash(currentShift.id);
                  setShiftSummary({ ...summary, openingCash: opening });
                }
                setShowCloseShiftModal(true);
              }} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition-colors shadow-sm"
            >
              Close Shift
            </button>
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Shift Active
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-gray-50 border-b flex gap-2 shrink-0">
          <input type="text" placeholder="Search or scan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 p-3 bg-white border border-gray-200 rounded-lg text-xs" />
          <button onClick={() => setIsScannerOpen(true)} className="p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0" title="Scan Barcode">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 19.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75Z" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 grid grid-cols-3 gap-3 content-start">
           {searchTerm && filteredProducts.length === 0 && <div className="col-span-3 text-center text-gray-400 py-10 text-xs">No products found.</div>}
           {(searchTerm ? filteredProducts : products).map((product: any) => (
             <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0}
               className={`bg-white rounded-lg border p-3 text-left h-28 flex flex-col justify-between transition-all ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-black active:scale-[0.98]'}`}>
               <p className="font-bold text-xs truncate">{product.name}</p>
               <div className="flex justify-between items-end">
                 <p className="text-sm font-extrabold">{formatCurrency(product.price)}</p>
                 <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${product.stock <= 0 ? 'bg-red-100 text-red-700' : 'text-gray-500'}`}>
                   {product.stock <= 0 ? 'OUT' : `${product.stock} left`}
                 </span>
               </div>
             </button>
           ))}
        </div>
      </div>

      <div className="w-[340px] bg-white border-l flex flex-col shadow-xl shrink-0">
        <div className="p-3 border-b flex justify-between items-center shrink-0">
           <h2 className="font-bold text-sm">Current Order ({cart.length})</h2>
           {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 font-medium">Clear</button>}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-xs">Cart empty</div>
          ) : (
            cart.map((item: any) => {
              const currentProduct = products.find(p => p.id === item.id);
              const maxStock = currentProduct?.stock || 0;
              const isOverStock = item.quantity > maxStock;

              return (
                <div key={item.id} className={`bg-gray-50 rounded-lg p-3 flex items-center gap-2 ${isOverStock ? 'ring-2 ring-red-200' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
                  </div>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                    className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 font-bold text-sm flex items-center justify-center shrink-0 disabled:opacity-30"
                  >-</button>
                  <input 
                    ref={(el) => { inputRefs.current[item.id] = el; }} 
                    type="number" 
                    value={item.quantity} 
                    max={maxStock}
                    onChange={(e) => updateQuantity(item.id, e.target.value)} 
                    className="w-14 h-7 text-center border border-gray-200 rounded text-xs font-bold appearance-none focus:ring-1 focus:ring-black focus:outline-none disabled:bg-red-50"
                  />
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                    disabled={item.quantity >= maxStock}
                    className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 font-bold text-sm flex items-center justify-center shrink-0 disabled:opacity-30"
                  >+</button>
                  <span className="font-bold text-xs w-16 text-right shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-3 border-t space-y-3 bg-white shrink-0">
          <div className="flex justify-between text-xs"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          {vatEnabled && <div className="flex justify-between text-xs text-gray-500"><span>VAT</span><span>{formatCurrency(tax)}</span></div>}
          <div className="flex justify-between font-extrabold text-xl border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
          
          <div className="flex gap-2">
             <button onClick={() => setPaymentMethod("cash")} className={`flex-1 py-2 rounded border-2 font-bold text-xs transition-colors ${paymentMethod === 'cash' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}>Cash</button>
             <button onClick={() => setPaymentMethod("mpesa")} className={`flex-1 py-2 rounded border-2 font-bold text-xs transition-colors ${paymentMethod === 'mpesa' ? 'bg-green-600 text-white' : 'bg-white hover:bg-gray-50'}`}>M-Pesa</button>
          </div>

          {paymentMethod === 'cash' && (
             <input type="number" placeholder="Cash Received" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full p-2 border rounded text-right text-xs font-bold" />
          )}

          <button 
            onClick={handleCompleteSale} 
            disabled={processing || cart.length === 0 || !isCartValid}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? "Processing..." : !isCartValid ? "⚠️ Update Cart (Stock Exceeded)" : "Charge " + formatCurrency(total)}
          </button>
        </div>
      </div>

      {lastSale && <ReceiptModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} saleData={lastSale} />}
      {isScannerOpen && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScannerOpen(false)} />}
      
      {/* Close Shift Modal */}
      {showCloseShiftModal && currentShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCloseShiftModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Close Shift</h2>
                <p className="text-[10px] text-gray-500 font-mono">{currentShift.id.slice(0, 8)}...</p>
              </div>
              <button onClick={() => setShowCloseShiftModal(false)} className="text-gray-400 hover:text-black text-xl font-bold">&times;</button>
            </div>
            
            {shiftSummary.transactionCount > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-xs space-y-2">
                <div className="flex justify-between"><span className="text-blue-800">Transactions</span><span className="font-bold">{shiftSummary.transactionCount}</span></div>
                <div className="flex justify-between"><span className="text-blue-800">Cash Sales</span><span className="font-mono font-bold">{formatCurrency(shiftSummary.cashSales)}</span></div>
                <div className="flex justify-between"><span className="text-blue-800">M-Pesa Sales</span><span className="font-mono font-bold">{formatCurrency(shiftSummary.mpesaSales)}</span></div>
                <div className="flex justify-between border-t border-blue-200 pt-2 mt-1">
                   <span className="text-blue-800 font-bold">Expected in Register</span>
                   <span className="font-mono font-bold">{formatCurrency(shiftSummary.cashSales + shiftSummary.openingCash)}</span>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-[10px] font-medium text-gray-700 mb-1.5">Actual Cash in Register (Ksh)</label>
              <input
                type="number"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg text-right font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCloseShiftModal(false)} 
                className="flex-1 py-3 border-2 border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCloseShift} 
                disabled={closingShift}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:bg-gray-400"
              >
                {closingShift ? "Closing..." : "Confirm Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}