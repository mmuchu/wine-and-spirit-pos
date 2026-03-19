 // src/components/inventory/ProductFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { useOrganization } from "@/lib/context/OrganizationContext";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

export function ProductFormModal({ isOpen, onClose, onSuccess, product }: ProductFormModalProps) {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    cost_price: '',
    stock: '',
    min_stock: '',
    category_id: '',
    is_active: true
  });

  useEffect(() => {
    if (organizationId) fetchCategories();
  }, [organizationId]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku || '',
        price: product.price?.toString() || '',
        cost_price: product.cost_price?.toString() || '',
        stock: product.stock?.toString() || '',
        min_stock: product.min_stock?.toString() || '',
        category_id: product.category_id || '',
        // FIX: Fallback to true if undefined
        is_active: product.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        price: '',
        cost_price: '',
        stock: '',
        min_stock: '',
        category_id: '',
        is_active: true
      });
    }
  }, [product]);

  const fetchCategories = async () => {
    if (!organizationId) return;
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        sku: formData.sku || null,
        price: parseFloat(formData.price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        organization_id: organizationId
      };

      if (product) {
        // Update
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('products')
          .insert(productData);
        
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="e.g. Tusker Lager 500ml"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Barcode</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">None</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (Ksh) *</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Ksh)</label>
              <input
                type="number"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock *</label>
              <input
                type="number"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Product is Active</label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 disabled:bg-gray-300"
            >
              {loading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}