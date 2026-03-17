 // src/components/pos/QuotationModal.tsx
"use client";

import { useState, useEffect } from "react";
import { quotationService } from "@/lib/services/quotationService";
import { formatCurrency } from "@/components/pos/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (quote: any) => void;
  organizationId: string | null;
}

export function QuotationModal({ isOpen, onClose, onLoad, organizationId }: Props) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchQuotes();
    }
  }, [isOpen, organizationId]);

  const fetchQuotes = async () => {
    if(!organizationId) return;
    setLoading(true);
    try {
      const data = await quotationService.getQuotations(organizationId);
      setQuotes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = (quote: any) => {
    onLoad(quote);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center shrink-0">
          <h2 className="font-bold">Saved Quotations</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 p-8">Loading...</div>
          ) : quotes.length === 0 ? (
            <div className="text-center text-gray-400 p-8">No saved quotations.</div>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => (
                <div key={q.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold">{q.customer_name || 'Walk-in'}</h3>
                      <p className="text-xs text-gray-400">{new Date(q.created_at).toLocaleString()}</p>
                    </div>
                    <span className="font-bold text-lg">{formatCurrency(q.total_amount)}</span>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => handleLoad(q)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                    >
                      Load to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}