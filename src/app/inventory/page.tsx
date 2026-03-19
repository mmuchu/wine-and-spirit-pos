 // src/app/inventory/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { ProductFormModal } from "@/components/inventory/ProductFormModal";
import { stockService } from "@/lib/services/stockService";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";

export default function InventoryPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockInModal, setIsStockInModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockInQty, setStockInQty] = useState("");
  const [stockInNote, setStockInNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
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

  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product || null);
    setIsModalOpen(true);
  };

  const handleOpenStockIn = (product: Product) => {
    setSelectedProduct(product);
    setStockInQty("");
    setStockInNote("");
    setIsStockInModal(true);
  };

  const handleStockIn = async () => {
    if (!selectedProduct || !stockInQty) return;
    
    setSubmitting(true);
    try {
      await stockService.addStock(selectedProduct.id, parseInt(stockInQty), organizationId, stockInNote);
      setIsStockInModal(false);
      fetchProducts();
    } catch (err) {
      console.error("Stock in error:", err);
      alert("Failed to update stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccess = () => {
    fetchProducts();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} products in database</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800"
        >
          + Add New Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
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
                {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading...</td></tr>
                ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">No products found.</td></tr>
                ) : (
                filteredProducts.map((product) => {
                    const cost = product.cost_price || 0;
                    const price = product.price || 0;
                    const profit = price - cost;
                    const minStock = product.min_stock || 10;
                    const currentStock = product.stock;
                    const isLow = currentStock < minStock;
                    
                    return (
                    <tr key={product.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{product.name}</td>
                        <td className="p-3 text-gray-500 font-mono text-xs">{product.sku || '-'}</td>
                        <td className="p-3 text-gray-500">{product.categories?.name || '-'}</td>
                        <td className="p-3 text-right text-red-500">{formatCurrency(cost)}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(price)}</td>
                        <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${profit > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {formatCurrency(profit)}
                        </span>
                        </td>
                        <td className="p-3 text-center">
                        <span className={`font-bold ${isLow ? 'text-red-600' : ''}`}>
                            {currentStock}
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
                            onClick={() => handleOpenModal(product)}
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

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        product={editingProduct}
        // FIX: Removed organizationId prop - the modal fetches it from context automatically
      />

      {/* Stock In Modal */}
      {isStockInModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Stock In: {selectedProduct.name}</h2>
              <button onClick={() => setIsStockInModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-xs text-gray-500">Current Stock</p>
              <p className="text-2xl font-bold">{selectedProduct.stock}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add *</label>
              <input
                type="number"
                value={stockInQty}
                onChange={(e) => setStockInQty(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center font-bold"
                placeholder="0"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
              <input
                type="text"
                value={stockInNote}
                onChange={(e) => setStockInNote(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="e.g. Purchase from Supplier X"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsStockInModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStockIn}
                disabled={submitting || !stockInQty}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-gray-300"
              >
                {submitting ? "Saving..." : "Add Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}