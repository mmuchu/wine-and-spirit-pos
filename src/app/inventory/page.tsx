 // src/app/inventory/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { ProductFormModal } from "@/components/inventory/ProductFormModal";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { stockService } from "@/lib/services/stockService";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { LowStockAlert } from "@/components/inventory/LowStockAlert";

export default function InventoryPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [recentMovements, setRecentMovements] = useState<any[]>([]);

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

  const handleOpenAdjustment = (product: Product) => {
    setSelectedProduct(product);
    setIsAdjustmentModalOpen(true);
  };
  
  const handleCloseAdjustment = () => {
    setIsAdjustmentModalOpen(false);
    // Optional: Clear selection after close
    // setSelectedProduct(null); 
  };

  const handleSuccess = () => {
    fetchProducts();
    fetchMovements();
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <LowStockAlert />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} SKUs</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
          className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 shadow-lg"
        >
          + New Product
        </button>
      </div>

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
        <div className="table-container overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px] sticky-header">
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
                  // FIX: Highlight if selected
                  const isSelected = selectedProduct?.id === product.id;
                  
                  return (
                    <tr 
                      key={product.id} 
                      className={`transition-colors duration-150 ${
                        isSelected 
                          ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
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
                          onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
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

      {/* RECENT MOVEMENTS LOG */}
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
                      {m.type.toUpperCase()} • {m.reason || m.notes || 'No note'} 
                      {m.suppliers && <span className="ml-1 text-blue-500">from {m.suppliers.name}</span>}
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
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={handleSuccess}
        product={editingProduct}
      />

      {selectedProduct && (
        <StockAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          onClose={handleCloseAdjustment}
          onSuccess={handleSuccess}
          product={selectedProduct}
        />
      )}
    </div>
  );
}