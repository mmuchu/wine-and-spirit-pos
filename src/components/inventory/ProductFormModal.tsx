 // src/components/inventory/ProductFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { stockService } from "@/lib/services/stockService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
  organizationId: string | null;
}

export function ProductFormModal({ isOpen, onClose, onSuccess, product, organizationId }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    name: "",
    price: "",
    cost_price: "0",
    stock: "0",
    min_stock: "10",
    category_id: "",
    sku: "", 
    is_active: true
  });

  // NEW: State for adding purchases
  const [addStockQty, setAddStockQty] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (product) {
        setForm({
          name: product.name,
          price: String(product.price),
          cost_price: String(product.cost_price || 0),
          stock: String(product.stock),
          min_stock: String(product.min_stock || 10),
          category_id: product.category_id || "",
          sku: product.sku || "",
          is_active: product.is_active
        });
      } else {
        // Reset form for new product
        setForm({ name: "", price: "", cost_price: "0", stock: "0", min_stock: "10", category_id: "", sku: "", is_active: true });
      }
      // Reset add stock field
      setAddStockQty("");
    }
  }, [isOpen, product]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name");
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Calculate new stock level
      const currentStock = parseInt(form.stock) || 0;
      const additionalStock = parseInt(addStockQty) || 0;
      const finalStock = currentStock + additionalStock;

      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        cost_price: parseFloat(form.cost_price),
        stock: finalStock, // Updated stock
        min_stock: parseInt(form.min_stock),
        category_id: form.category_id || null,
        sku: form.sku || null,
        is_active: form.is_active,
        organization_id: organizationId
      };

      if (product) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id);
        if (error) throw error;

        // Log purchase if quantity was added
        if (additionalStock > 0) {
          await stockService.addStock(product.id, additionalStock, organizationId, "Purchase via Edit");
        }
      } else {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert(payload)
          .select('id')
          .single();
        
        if (error) throw error;

        // Log purchase if quantity was added during creation
        if (additionalStock > 0 && newProduct) {
           await stockService.addStock(newProduct.id, additionalStock, organizationId, "Initial Stock");
        }
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{product ? "Edit Product" : "Add New Product"}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Barcode / SKU (Scan Here)</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full p-2 border rounded font-mono focus:ring-2 focus:ring-blue-500"
              placeholder="Scan barcode or type code"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (Ksh) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost Price (Ksh)</label>
              <input
                type="number"
                step="0.01"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium mb-1">Current Stock</label>
              <input
                type="number"
                required
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Stock Level</label>
              <input
                type="number"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* NEW: Purchase Input */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <label className="block text-sm font-bold text-blue-800 mb-1">Receive Stock (Purchase)</label>
            <input
              type="number"
              placeholder="0"
              value={addStockQty}
              onChange={(e) => setAddStockQty(e.target.value)}
              className="w-full p-2 border rounded mt-1"
            />
            <p className="text-xs text-blue-600 mt-1">
              Enter quantity received. This will add to "Current Stock" and log as a purchase.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            <label className="text-sm">Active</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:bg-gray-300">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}