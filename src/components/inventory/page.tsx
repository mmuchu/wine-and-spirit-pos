 // src/app/inventory/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { formatCurrency, getCategoryName } from "@/components/pos/utils";
import { ProductFormModal } from "@/components/inventory/ProductFormModal";
import { stockService } from "@/lib/services/stockService";
import { useOrganization } from "@/lib/context/OrganizationContext";

export default function InventoryPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Stock In Modal State
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Quick Scan State
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");

  useEffect(() => {
    if (organizationId) fetchProducts();
  }, [organizationId]);

  const fetchProducts = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, cost_price, stock, min_stock, is_active, sku, category_id, categories(name)")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProductModal = (product: Product | null) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleSuccess = () => {
    fetchProducts();
  };

  const handleOpenStockIn = (product: Product) => {
    setSelectedProduct(product);
    setIsStockInOpen(true);
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !organizationId) return;
    
    setSubmitting(true);
    try {
      // FIX: Pass organizationId to ensure it shows in reports
      await stockService.addStock(
        selectedProduct.id, 
        parseInt(stockQty), 
        organizationId, 
        stockNotes
      );
      
      fetchProducts();
      setIsStockInOpen(false);
      setSelectedProduct(null);
      setStockQty("");
      setStockNotes("");
    } catch (error) {
      console.error(error);
      alert("Failed to update stock.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Quick Scan Logic ---
  const handleQuickScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const found = products.find(p => 
        p.sku?.toLowerCase() === scanInput.toLowerCase()
      );

      if (found) {
        // Found existing product -> Open Stock In
        setSelectedProduct(found);
        setIsQuickScanOpen(false);
        setIsStockInOpen(true);
        setScanInput("");
      } else {
        // Not found -> Open Create Product with SKU pre-filled
        if(confirm("Product not found. Create new product with this barcode?")) {
          setEditingProduct({ sku: scanInput } as Product);
          setIsProductModalOpen(true);
          setIsQuickScanOpen(false);
          setScanInput("");
        }
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8">Loading Inventory...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-muted-foreground text-sm">{products.length} products in database</p>
        </div>
        <div className="flex gap-2">
            <button
              onClick={() => setIsQuickScanOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75Z" />
              </svg>
              Scan to Stock
            </button>
            <button
              onClick={() => handleOpenProductModal(null)}
              className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition shadow-sm"
            >
              + Add Product
            </button>
        </div>
      </div>

      {/* Search */}
      <div className="w-full md:w-1/3">
        <input
          type="text"
          placeholder="Search by Name or Barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded-lg bg-card"
        />
      </div>

      {/* Products Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold">Product</th>
                <th className="text-left p-3 font-semibold">Barcode / SKU</th>
                <th className="text-left p-3 font-semibold">Category</th>
                <th className="text-right p-3 font-semibold">Cost (Buy)</th>
                <th className="text-right p-3 font-semibold">Price (Sell)</th>
                <th className="text-center p-3 font-semibold">Profit</th>
                <th className="text-center p-3 font-semibold">Stock</th>
                <th className="text-right p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const profit = (product.price || 0) - (product.cost_price || 0);
                  const isLow = product.stock < (product.min_stock || 10);
                  
                  return (
                    <tr key={product.id} className="hover:bg-muted/10">
                      <td className="p-3 font-medium">{product.name}</td>
                      <td className="p-3 text-gray-500 font-mono text-xs">{product.sku || '-'}</td>
                      <td className="p-3 text-gray-500">{getCategoryName(product)}</td>
                      <td className="p-3 text-right text-red-500">{formatCurrency(product.cost_price || 0)}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(product.price)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${profit > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {formatCurrency(profit)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${isLow ? 'text-red-600' : ''}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenStockIn(product)}
                          className="text-green-600 hover:underline font-medium text-xs"
                        >
                          Stock In
                        </button>
                        <button
                          onClick={() => handleOpenProductModal(product)}
                          className="text-blue-600 hover:underline font-medium text-xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        onSuccess={handleSuccess}
        product={editingProduct}
        organizationId={organizationId}
      />

      {/* Stock In Modal */}
      {isStockInOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-xl p-6">
            <h2 className="text-lg font-bold mb-2">Stock In: {selectedProduct.name}</h2>
            <p className="text-xs text-gray-500 mb-4">Current Stock: {selectedProduct.stock}</p>
            
            <form onSubmit={handleStockInSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Quantity Received</label>
                <input
                  type="number"
                  required
                  autoFocus
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <input
                  type="text"
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                  placeholder="Invoice #123"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setIsStockInOpen(false); setSelectedProduct(null); }} className="flex-1 py-2 border rounded font-medium">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-green-600 text-white rounded font-bold disabled:bg-gray-300">
                  {submitting ? "Saving..." : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Scan Modal */}
      {isQuickScanOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-xl p-6 text-center">
            <h2 className="text-lg font-bold mb-4">Scan Barcode</h2>
            <p className="text-xs text-gray-500 mb-4">Scan the product barcode to add stock or create a new product.</p>
            
            <input
              autoFocus
              type="text"
              placeholder="Waiting for scan..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleQuickScan}
              className="w-full p-4 border-2 border-dashed rounded text-center text-xl font-mono focus:outline-none focus:border-blue-500"
            />
            
            <button onClick={() => setIsQuickScanOpen(false)} className="mt-4 text-xs text-gray-400 hover:text-gray-600">
              Cancel (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}