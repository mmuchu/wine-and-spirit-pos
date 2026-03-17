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
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
    }
  }, [organizationId]);

  const fetchProducts = async () => {
    if (!organizationId) return;
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
    setIsStockInModalOpen(true);
  };

  const handleStockInSubmit = async (quantity: number, notes: string) => {
    if (!selectedProduct) return;
    try {
      await stockService.addStock(selectedProduct.id, quantity, notes);
      fetchProducts();
      setIsStockInModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      alert("Failed to update stock.");
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8">Loading Inventory...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-muted-foreground text-sm">{products.length} products in database</p>
        </div>
        <button
          onClick={() => handleOpenProductModal(null)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm"
        >
          + Add New Product
        </button>
      </div>

      {/* Search */}
      <div className="w-full md:w-1/3">
        <input
          type="text"
          placeholder="Search products..."
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
                <th className="text-left p-3 font-semibold">Category</th>
                <th className="text-right p-3 font-semibold">Cost (Buy)</th>
                <th className="text-right p-3 font-semibold">Price (Sell)</th>
                <th className="text-center p-3 font-semibold">Profit/Unit</th>
                <th className="text-center p-3 font-semibold">Stock</th>
                <th className="text-center p-3 font-semibold">Min Level</th>
                <th className="text-center p-3 font-semibold">Status</th>
                <th className="text-right p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const minStock = product.min_stock || 10;
                  const currentStock = product.stock;
                  const cost = product.cost_price || 0;
                  const price = product.price || 0;
                  const profit = price - cost;
                  
                  let statusColor = "bg-green-100 text-green-800";
                  let statusText = "In Stock";
                  
                  if (currentStock <= 0) {
                    statusColor = "bg-red-100 text-red-800";
                    statusText = "Out of Stock";
                  } else if (currentStock < minStock) {
                    statusColor = "bg-yellow-100 text-yellow-800";
                    statusText = "Low Stock";
                  }

                  return (
                    <tr key={product.id} className="hover:bg-muted/10">
                      <td className="p-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {getCategoryName(product)}
                      </td>
                      <td className="p-3 text-right text-red-500 font-medium">
                        {formatCurrency(cost)}
                      </td>
                      <td className="p-3 text-right font-bold">
                        {formatCurrency(price)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${profit > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {formatCurrency(profit)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${currentStock < minStock ? 'text-red-600' : ''}`}>
                          {currentStock}
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-500">
                        {minStock}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {statusText}
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

      <StockInModal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        product={selectedProduct}
        onSubmit={handleStockInSubmit}
      />
    </div>
  );
}

function StockInModal({ isOpen, onClose, product, onSubmit }: {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: (qty: number, notes: string) => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(parseInt(quantity), notes);
    setLoading(false);
    setQuantity("");
    setNotes("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-sm shadow-xl p-6">
        <h2 className="text-lg font-bold mb-4">Receive Stock: {product.name}</h2>
        <p className="text-sm text-gray-500 mb-4">Current Stock: {product.stock}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quantity Received</label>
            <input
              type="number"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="Invoice #123"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold">
              {loading ? "Saving..." : "Add Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}