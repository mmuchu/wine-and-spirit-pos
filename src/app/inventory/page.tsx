 // src/app/inventory/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { stockService } from "@/lib/services/stockService";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { LowStockAlert } from "@/components/inventory/LowStockAlert";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";

export default function InventoryPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Form State (Inline)
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form Fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("Spirits");
  
  // Modals
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  
  // Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
      fetchMovements();
    }
  }, [organizationId]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    }
  }, [searchTerm, products]);

  // --- Data Fetching ---
  const fetchProducts = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("organization_id", organizationId)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    if (!organizationId) return;
    try {
      const data = await stockService.getRecentMovements(organizationId);
      setRecentMovements(data || []);
    } catch (err) {
      console.error("Error fetching movements", err);
    }
  };

  // --- Form Handlers ---
  const openNewForm = () => {
    setEditingProduct(null);
    setName("");
    setSku("");
    setPrice("");
    setCostPrice("");
    setStock("");
    setCategory("Spirits");
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku || "");
    setPrice(String(product.price));
    setCostPrice(String(product.cost_price || 0));
    setStock(String(product.stock));
    setCategory(product.category_id || "Spirits");
    setShowForm(true);
  };

  const handleSaveProduct = async () => {
    if (!name || !price) {
      alert("Name and Price are required.");
      return;
    }
    setSaving(true);

    try {
      if (editingProduct) {
        // Update
        const { error } = await supabase
          .from("products")
          .update({
            name,
            sku: sku || null,
            price: parseFloat(price),
            cost_price: parseFloat(costPrice) || 0,
            stock: parseInt(stock) || 0,
            category_id: category
          })
          .eq("id", editingProduct.id);
        
        if (error) throw error;
      } else {
        // Create
        if (!organizationId) return;
        const { error } = await supabase.from("products").insert({
          organization_id: organizationId,
          name,
          sku: sku || null,
          price: parseFloat(price),
          cost_price: parseFloat(costPrice) || 0,
          stock: parseInt(stock) || 0,
          category_id: category,
          is_active: true
        });
        if (error) throw error;
      }

      setShowForm(false);
      fetchProducts();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- Scanner Handler ---
  const handleBarcodeScan = (code: string) => {
    setSku(code);
    setIsScannerOpen(false);
  };

  // --- Adjustment ---
  const handleOpenAdjustment = (product: Product) => {
    setSelectedProduct(product);
    setIsAdjustmentModalOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <LowStockAlert />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} SKUs</p>
        </div>
        <button
          onClick={openNewForm}
          className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 shadow-lg"
        >
          + New Product
        </button>
      </div>

      {/* Inline Form (Add/Edit) */}
      {showForm && (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-bold">{editingProduct ? "Edit Product" : "New Product"}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-black text-xl">&times;</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg" />
            </div>

            {/* SKU with Scanner */}
            <div>
              <label className="block text-sm font-medium mb-1">Barcode / SKU</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={sku} 
                  onChange={(e) => setSku(e.target.value)} 
                  className="flex-1 p-3 border rounded-lg" 
                  placeholder="Scan or type" 
                />
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  className="p-3 bg-black text-white rounded-lg hover:bg-gray-800"
                  title="Scan Barcode"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75Z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (Ksh) *</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cost Price (Ksh)</label>
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock Quantity</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 border rounded-lg">
                <option>Spirits</option>
                <option>Beer</option>
                <option>Wine</option>
                <option>Soft Drinks</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSaveProduct}
            disabled={saving}
            className="w-full py-3 bg-black text-white rounded-lg font-bold disabled:bg-gray-300"
          >
            {saving ? "Saving..." : "Save Product"}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="sticky top-0 z-10 py-2 bg-gray-50">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold">Product</th>
                <th className="text-left p-3 font-semibold">Category</th>
                <th className="text-right p-3 font-semibold">Cost</th>
                <th className="text-right p-3 font-semibold">Price</th>
                <th className="text-center p-3 font-semibold">Stock</th>
                <th className="text-right p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No products found.</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLow = product.stock < (product.min_stock || 10);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.sku || '-'}</p>
                      </td>
                      <td className="p-3 text-gray-500">{product.categories?.name || '-'}</td>
                      <td className="p-3 text-right text-gray-500">{formatCurrency(product.cost_price || 0)}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(product.price)}</td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${isLow ? 'text-red-600' : ''}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenAdjustment(product)}
                          className="text-blue-600 hover:underline font-medium text-xs bg-blue-50 px-2 py-1 rounded"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => openEditForm(product)}
                          className="text-gray-600 hover:underline font-medium text-xs"
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

      {/* Recent Movements */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg">Recent Stock Movements</h3>
          <Link href="/reports/audit" className="text-xs text-blue-600 hover:underline">View Full Audit</Link>
        </div>
        
        <div className="divide-y max-h-96 overflow-y-auto">
          {recentMovements.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 text-center">No movements yet.</p>
          ) : (
            recentMovements.map((m) => (
              <div key={m.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${m.quantity > 0 ? 'bg-green-500' : 'bg-red-400'}`}></div>
                  <div>
                    <p className="font-medium text-sm">{m.products?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">
                      {m.type.toUpperCase()} • {m.notes || 'No note'} 
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </p>
                  <p className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedProduct && (
        <StockAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onSuccess={fetchProducts}
          product={selectedProduct}
        />
      )}

      {/* Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
    </div>
  );
}