 // src/app/pos/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { Product, CartItem } from "@/lib/types";
import { auditService } from "@/lib/services/auditService";
import { shiftService } from "@/lib/services/shiftService";

export default function POSPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
      fetchSettings();
      fetchActiveShift();
    }
  }, [organizationId]);

  const fetchActiveShift = async () => {
    if (!organizationId) return;
    try {
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);
    } catch (err) {
      console.error("Error checking shift", err);
    }
  };

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

  const fetchProducts = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    if (!organizationId) return;
    const { data } = await supabase.from('settings').select('*').eq('organization_id', organizationId).single();
    if (data) {
      setVatEnabled(data.vat_enabled ?? true);
      setShopName(data.shop_name || "KENYAN SPIRIT");
      setShopAddress(data.address || "Nairobi, Kenya");
      setShopPhone(data.phone || "");
    }
  };

  // Helper to focus input
  const focusCartInput = (productId: string) => {
    // Small timeout to allow DOM to update
    setTimeout(() => {
      const input = document.getElementById(`cart-input-${productId}`);
      if (input) {
        input.focus();
        (input as HTMLInputElement).select();
      }
    }, 50);
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
    
    // Focus the input for this product
    focusCartInput(product.id);
  };

  // Focus when clicking row in sidebar
  const handleRowClick = (productId: string) => {
    focusCartInput(productId);
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

  const subtotal = cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + (price * qty);
  }, 0);
  
  const tax = vatEnabled ? subtotal * 0.16 : 0;
  const total = subtotal + tax;
  const change = parseFloat(cashReceived) - total;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    if (!currentShift) {
      alert("No Active Shift. Please start a shift first.");
      return;
    }

    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      if (!product) continue;
      
      if (product.stock < item.quantity) {
        alert(`Insufficient stock for "${item.name}". \nAvailable: ${product.stock}, Requested: ${item.quantity}`);
        return;
      }
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          organization_id: organizationId,
          user_id: user?.id,
          total_amount: total,
          subtotal: subtotal,
          tax_amount: tax,
          payment_method: paymentMethod,
          status: paymentMethod === "mpesa" ? "pending" : "completed",
          shift_id: currentShift.id,
          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            cost_price: item.cost_price || 0,
            quantity: item.quantity,
          })),
        })
        .select()
        .single();

      if (saleError) throw saleError;

      for (const item of cart) {
        const product = products.find((p) => p.id === item.id);
        if (product) {
          await supabase
            .from("products")
            .update({ stock: product.stock - item.quantity })
            .eq("id", item.id);
        }
      }

      auditService.log(
        "SALE_COMPLETED",
        `Sold ${cart.length} items for ${formatCurrency(total)}`,
        organizationId,
        { sale_id: sale.id, shift_id: currentShift.id }
      );

      setLastSale({ 
        ...sale, 
        date: new Date().toISOString(),
        shop_name: shopName,
        address: shopAddress,
        phone: shopPhone
      });
      
      setIsReceiptModalOpen(true);
      setCart([]);
      setCashReceived("");
      fetchProducts();

    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-100 text-gray-500">Loading POS...</div>;

  if (!currentShift && !loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100 space-y-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h2 className="text-2xl font-bold text-gray-800">No Active Shift</h2>
        <p className="text-gray-500">You must start a shift to make sales.</p>
        <p className="text-sm text-gray-400">Check the Sidebar to start one.</p>
      </div>
    );
  }

  const renderProductGrid = (items: Product[]) => (
    <div className="grid grid-cols-2 gap-4 p-6">
      {items.map((product) => (
        <button
          key={product.id}
          onClick={() => addToCart(product)}
          disabled={product.stock <= 0}
          className={`group relative bg-white rounded-xl border transition-all duration-150 text-left h-36 flex flex-col justify-between overflow-hidden ${
            product.stock <= 0 
              ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100" 
              : "border-gray-200 hover:border-black hover:shadow-lg hover:-translate-y-0.5"
          }`}
        >
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <p className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight">{product.name}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{product.categories?.name || 'General'}</p>
            </div>
            <div className="flex items-end justify-between mt-2">
              <p className="text-lg font-extrabold text-gray-900">{formatCurrency(product.price)}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                product.stock <= 0 ? 'bg-gray-100 text-gray-400' : 
                product.stock <= 5 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'
              }`}>
                {product.stock <= 0 ? 'Empty' : `${product.stock} left`}
              </span>
            </div>
          </div>
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
             <span className="bg-black text-white text-xs font-bold px-3 py-1 rounded-full shadow">+ Add</span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sales Terminal</h1>
          <span className="px-2 py-1 text-[10px] bg-green-100 text-green-700 rounded font-bold uppercase">
            Shift Active
          </span>
        </div>

        <div className="p-4 bg-gray-50 border-b">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products by name or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-4 bg-white border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-black focus:border-transparent transition shadow-sm"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {searchTerm && filteredProducts.length > 0 ? (
            renderProductGrid(filteredProducts)
          ) : searchTerm && filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
              <p className="font-medium">No products found</p>
            </div>
          ) : (
            renderProductGrid(products)
          )}
        </div>
      </div>

      <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col h-screen shadow-2xl">
        
        <div className="px-6 py-5 border-b border-gray-100 bg-white shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg text-gray-900">Current Order</h2>
              <p className="text-xs text-gray-400 mt-0.5">{cart.length} items in cart</p>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs font-medium text-red-500 hover:text-red-600">
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
              // FIX: Click row to focus input
              <div 
                key={item.id} 
                onClick={() => handleRowClick(item.id)}
                className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity - 1); }} 
                    className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition"
                  >
                    -
                  </button>
                  <input
                    id={`cart-input-${item.id}`} // ID for focusing
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()} // Prevent row click double trigger
                    className="w-10 text-center font-bold text-sm border rounded focus:ring-2 focus:ring-black"
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity + 1); }} 
                    className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition"
                  >
                    +
                  </button>
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
                  ? "bg-black text-white border-black shadow-md" 
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              Cash
            </button>
            <button
              onClick={() => setPaymentMethod("mpesa")}
              className={`py-3 rounded-lg font-bold text-sm border-2 transition-all ${
                paymentMethod === "mpesa" 
                  ? "bg-green-600 text-white border-green-600 shadow-md" 
                  : "bg-white text-gray-600 border-gray-200 hover:border-green-200"
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
            className="w-full py-5 bg-red-600 text-white rounded-xl font-extrabold text-lg disabled:bg-gray-200 disabled:text-gray-400 shadow-[0_4px_20px_-5px_rgba(220,38,38,0.5)] hover:shadow-[0_6px_25px_-5px_rgba(220,38,38,0.6)] transition-all active:scale-[0.99] disabled:active:scale-100 uppercase tracking-wide"
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