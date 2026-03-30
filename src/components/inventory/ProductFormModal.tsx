 "use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: any;
}

export function ProductFormModal({ isOpen, onClose, onSuccess, product }: ProductFormModalProps) {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    cost_price: '',
    stock: '0', 
    min_stock: '10',
    category_id: '',
    is_active: true
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (product) {
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          price: product.price?.toString() || '',
          cost_price: product.cost_price?.toString() || '',
          stock: product.stock?.toString() || '0',
          min_stock: product.min_stock?.toString() || '10',
          category_id: product.category_id || '',
          is_active: product.is_active ?? true
        });
      } else {
        setFormData({ name: '', sku: '', price: '', cost_price: '', stock: '0', min_stock: '10', category_id: '', is_active: true });
      }
    }
  }, [isOpen, product]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name');
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    
    setSaving(true);
    try {
      const payload = {
        organization_id: organizationId,
        name: formData.name,
        sku: formData.sku || null,
        price: parseFloat(formData.price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        category_id: formData.category_id || null,
        is_active: formData.is_active
      };

      let error;
      
      if (product?.id) {
        // --- EDITING EXISTING PRODUCT ---
        const oldStock = product.stock || 0;
        const newStock = parseInt(formData.stock) || 0;
        
        const result = await supabase.from('products').update(payload).eq('id', product.id);
        error = result.error;

        // AUDIT: Log the difference in stock if it changed
        if (!error && oldStock !== newStock) {
          const stockDiff = newStock - oldStock;
          await supabase.from('stock_movements').insert({
            organization_id: organizationId, // ADDED FIX
            product_id: product.id,
            quantity: stockDiff,
            type: stockDiff > 0 ? 'purchase' : 'adjustment'
          });
        }

      } else {
        // --- CREATING NEW PRODUCT ---
        const { data: newProduct, error: insertError } = await supabase.from('products').insert(payload).select().single();
        error = insertError;

        // AUDIT: Log initial stock safely
        if (!insertError && newProduct && payload.stock > 0) {
          await supabase.from('stock_movements').insert({
            organization_id: organizationId, // ADDED FIX
            product_id: newProduct.id,
            quantity: payload.stock,
            type: 'purchase'
          });
        }
      }

      if (error) throw error;
      
      onSuccess();
      onClose();
      
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-bold">{product ? 'Edit Product' : 'Add New Product'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Barcode / SKU</label>
            <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="Scan or type" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (Ksh) *</label>
              <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full p-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost Price (Ksh)</label>
              <input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} className="w-full p-3 border rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stock Quantity</label>
              <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full p-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Low Stock Alert</label>
              <input type="number" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} className="w-full p-3 border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full p-3 border rounded-lg">
              <option value="">None</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
            <label className="text-sm">Active</label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300">
              {saving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}