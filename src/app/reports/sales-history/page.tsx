 // src/app/reports/sales-history/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  payment_method?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export default function SalesHistoryPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (organizationId) fetchOrders();
  }, [organizationId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, total, status, payment_method")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) setOrders(data as Order[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewItems = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("name, quantity, unit_price")
        .eq("order_id", order.id);

      if (!error && data) setOrderItems(data as OrderItem[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setOrderItems([]);
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Sales History</h1>
          <p className="text-xs text-gray-500 mt-1">{orders.length} recent orders</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 text-gray-400 text-sm">No sales recorded yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-3 text-left text-[10px] uppercase tracking-wider text-gray-500 font-bold">Time</th>
                <th className="p-3 text-left text-[10px] uppercase tracking-wider text-gray-500 font-bold">Order ID</th>
                <th className="p-3 text-left text-[10px] uppercase tracking-wider text-gray-500 font-bold">Method</th>
                <th className="p-3 text-right text-[10px] uppercase tracking-wider text-gray-500 font-bold">Total</th>
                <th className="p-3 text-center text-[10px] uppercase tracking-wider text-gray-500 font-bold w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-600 font-mono text-[11px]">
                    {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <div className="text-[10px] text-gray-400">
                      {new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </td>
                  <td className="p-3 text-gray-400 font-mono text-[10px]">{order.id.slice(0, 8)}...</td>
                  <td className="p-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${order.payment_method === 'mpesa' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                      {(order.payment_method || 'CASH').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-gray-900 font-mono text-[11px]">{formatCurrency(order.total)}</td>
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => handleViewItems(order)}
                      className="text-[10px] font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      View Items
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">Order Details</h2>
                <p className="text-[10px] text-gray-500 font-mono">{selectedOrder.id}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-black text-xl font-bold">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingItems ? (
                <p className="text-xs text-gray-500">Loading items...</p>
              ) : (
                orderItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-xs text-gray-700 border-b border-gray-100 pb-2">
                    <div className="pr-4">
                      <p className="font-medium">{item.name || "Unknown Item"}</p>
                      <p className="text-[10px] text-gray-400">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                    </div>
                    <p className="font-bold text-gray-900 font-mono whitespace-nowrap">{formatCurrency(item.quantity * item.unit_price)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl shrink-0">
              <div className="flex justify-between font-bold text-sm text-gray-900">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}