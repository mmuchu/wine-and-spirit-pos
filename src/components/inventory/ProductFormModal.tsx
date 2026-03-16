 // src/components/inventory/ProductFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { formatCurrency } from "@/components/pos/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

export function ProductFormModal({ isOpen, onClose, onSuccess, product }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "0",
    min_stock: "10", // NEW
    category_id: "",
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (product) {
        setForm({
          name: product.name,
          price: String(product.price),
          stock: String(product.stock),
          min_stock: String(product.min_stock || 10), // NEW
          category_id: product.category_id || "",
          is_active: product.is_active
        });
      } else {
        // Reset for new product
        setForm({ name: "", price: "", stock: "0", min_stock: "10", category_id: "", is_active: true });
      }
    }
  }, [isOpen, product]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name");
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        min_stock: parseInt(form.min_stock), // NEW
        category_id: form.category_id || null,
        is_active: form.is_active
      };

      if (product) {
        // Update
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from("products")
          .insert(payload);
        if (error) throw error;
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
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl p-6">
        <h2 className="text-lg font-bold mb-4">{product ? "Edit Product" : "Add New Product"}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price (Ksh)</label>
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
              <label className="block text-sm font-medium mb-1">Current Stock</label>
              <input
                type="number"
                required
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* NEW: Min Stock Field */}
          <div>
            <label className="block text-sm font-medium mb-1">Low Stock Alarm Level</label>
            <input
              type="number"
              required
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="Warn if stock falls below..."
            />
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
            <label className="text-sm">Active (Visible in POS)</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-300">
              {loading ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}