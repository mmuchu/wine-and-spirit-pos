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
    name: '', sku: '', price: '', cost_price: '', stock: '',
    min_stock: '', category_id: '', is_active: true
  });

  // State for Quick Stock In
  const [stockToAdd, setStockToAdd] = useState("");
  const [purchaseUnitCost, setPurchaseUnitCost] = useState("");

  useEffect(() => { if (organizationId) fetchCategories(); }, [organizationId]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name, sku: product.sku || '', price: product.price?.toString() || '',
        cost_price: product.cost_price?.toString() || '', stock: product.stock?.toString() || '',
        min_stock: product.min_stock?.toString() || '', category_id: product.category_id || '',
        is_active: product.is_active ?? true
      });
    } else {
      setFormData({ name: '', sku: '', price: '', cost_price: '', stock: '', min_stock: '', category_id: '', is_active: true });
    }
    setStockToAdd("");
    setPurchaseUnitCost("");
  }, [product]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').eq('organization_id', organizationId).order('name');
    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    
    setLoading(true);
    try {
      let finalStock = parseInt(formData.stock) || 0;
      let finalCostPrice = parseFloat(formData.cost_price) || 0;
      const purchaseQty = parseInt(stockToAdd) || 0;
      const unitCost = parseFloat(purchaseUnitCost) || 0;

      // MOVING AVERAGE COST LOGIC
      if (purchaseQty > 0 && unitCost > 0) {
        if (product) {
          // Existing product: Calculate new average
          const currentStock = product.stock || 0;
          const currentCost = product.cost_price || 0;
          
          // Formula: (OldValue + NewValue) / NewTotalStock
          const oldValue = currentStock * currentCost;
          const newValue = purchaseQty * unitCost;
          const newTotalStock = currentStock + purchaseQty;
          
          finalCostPrice = (oldValue + newValue) / newTotalStock;
          finalStock = newTotalStock;
        } else {
          // New product: Cost is simply the purchase cost
          finalCostPrice = unitCost;
          finalStock = purchaseQty;
        }
      }

      const productData = {
        name: formData.name, sku: formData.sku || null,
        price: parseFloat(formData.price) || 0,
        cost_price: finalCostPrice, // Save calculated average cost
        stock: finalStock,
        min_stock: parseInt(formData.min_stock) || 10,
        category_id: formData.category_id || null, is_active: formData.is_active,
        organization_id: organizationId
      };

      let targetProductId = product?.id;

      if (product) {
        const { error } = await supabase.from('products').update(productData).eq('id', product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select().single();
        if (error) throw error;
        targetProductId = data.id;
      }

      // Record the movement
      if (purchaseQty > 0 && targetProductId) {
        await supabase.from('stock_movements').insert({
          organization_id: organizationId,
          product_id: targetProductId,
          quantity: purchaseQty,
          type: 'purchase',
          notes: `Purchased @ ${unitCost}`
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
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
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Fields (Condensed) */}
          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full p-2 border rounded">
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full p-2 border rounded" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (Ksh) *</label>
              <input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Cost (Avg)</label>
              <input type="number" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full p-2 border rounded bg-gray-50" title="This updates automatically when you purchase stock" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Stock *</label>
              <input type="number" required value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Low Stock Alert</label>
              <input type="number" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                className="w-full p-2 border rounded" />
            </div>
          </div>

          {/* --- PURCHASE / STOCK IN SECTION --- */}
          <div className="border-t pt-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <label className="block text-sm font-bold text-blue-800 mb-1">
               Quick Stock In (Purchases)
            </label>
            <p className="text-xs text-gray-600 mb-2">
                Enter details of NEW stock received. The system calculates the new Average Cost automatically.
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="number"
                  value={stockToAdd}
                  onChange={(e) => setStockToAdd(e.target.value)}
                  className="w-full p-2 border border-blue-300 rounded font-bold"
                  placeholder="Quantity"
                  min="0"
                />
                <input
                  type="number"
                  value={purchaseUnitCost}
                  onChange={(e) => setPurchaseUnitCost(e.target.value)}
                  className="w-full p-2 border border-blue-300 rounded font-bold"
                  placeholder="Unit Cost (Buy Price)"
                  min="0"
                />
            </div>
            <p className="text-[10px] text-blue-700 italic">
                Example: Buying 10 units @ 150 will update the cost price.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-black text-white rounded font-bold disabled:bg-gray-300">
              {loading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}