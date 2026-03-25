 // src/app/reports/stock/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { shiftService } from "@/lib/services/shiftService";

export default function StockReturnPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Expired");
  const [notes, setNotes] = useState("");

  // History State
  const [returns, setReturns] = useState<any[]>([]);

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Products
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, stock")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      setProducts(prods || []);

      // 2. Load Suppliers
      const { data: sups } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("organization_id", organizationId);
      setSuppliers(sups || []);

      // 3. Load Recent Returns
      const { data: history } = await supabase
        .from("stock_movements")
        .select("*, products(name), suppliers(name)")
        .eq("organization_id", organizationId)
        .eq("type", "return")
        .order("created_at", { ascending: false })
        .limit(20);
      
      setReturns(history || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity) {
      alert("Please select a product and enter quantity.");
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    if (parseFloat(quantity) > product.stock) {
      alert(`Insufficient stock. Only ${product.stock} available.`);
      return;
    }

    setSaving(true);
    try {
      const shift = await shiftService.getCurrentShift(organizationId);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert Movement
      const { error: moveError } = await supabase.from("stock_movements").insert({
        organization_id: organizationId,
        product_id: selectedProduct,
        supplier_id: selectedSupplier || null,
        quantity: -Math.abs(parseFloat(quantity)), // NEGATIVE for return
        type: "return",
        shift_id: shift?.id,
        notes: `${reason}: ${notes}`,
        user_id: user?.id
      });

      if (moveError) throw moveError;

      // 2. Update Product Stock
      const { error: prodError } = await supabase
        .from("products")
        .update({ stock: product.stock - parseFloat(quantity) })
        .eq("id", selectedProduct);

      if (prodError) throw prodError;

      alert("Stock return recorded successfully!");
      
      // Reset & Refresh
      setQuantity("");
      setNotes("");
      loadData();

    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Returns</h1>
        <p className="text-gray-500 text-sm mt-1">Record items returned to suppliers (Expired, Damaged, etc.)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORM */}
        <div className="lg:col-span-1 bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">New Return</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
            >
              <option value="">Select Product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.stock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Supplier (Optional)</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
            >
              <option value="">Select Supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm"
              >
                <option>Expired</option>
                <option>Damaged</option>
                <option>Quality Issue</option>
                <option>Wrong Item</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
              rows={2}
              placeholder="Optional details..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-300"
          >
            {saving ? "Processing..." : "Record Return"}
          </button>
        </div>

        {/* HISTORY */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Recent Returns</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-left">Supplier</th>
                  <th className="p-3 text-left">Reason</th>
                  <th className="p-3 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      No stock returns recorded yet.
                    </td>
                  </tr>
                ) : (
                  returns.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{r.products?.name || 'Unknown'}</td>
                      <td className="p-3 text-gray-500">{r.suppliers?.name || '-'}</td>
                      <td className="p-3 text-gray-500">{r.notes || '-'}</td>
                      <td className="p-3 text-right font-bold text-red-600">-{Math.abs(r.quantity)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}