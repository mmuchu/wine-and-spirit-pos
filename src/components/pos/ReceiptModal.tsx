 // src/components/pos/ReceiptModal.tsx
"use client";

import { CartItem } from "@/lib/types";
import { formatCurrency } from "./utils";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    id: string;
    items: CartItem[];
    total: number;
    subtotal: number;
    tax: number;
    paymentMethod: string;
    date: string;
  } | null;
}

export function ReceiptModal({ isOpen, onClose, saleData }: ReceiptModalProps) {
  if (!isOpen || !saleData) return null;

  const handlePrint = () => {
    window.print();
  };

  const receiptNumber = saleData.id.slice(0, 8).toUpperCase();
  const transactionDate = new Date(saleData.date);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
      {/* Container: Controlled Height */}
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:max-h-full">
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 text-sm font-mono text-gray-900">
            
            {/* Header */}
            <div className="text-center border-b border-dashed pb-4 mb-4">
              <h2 className="text-lg font-bold">The Kenyan Spirit Lounge</h2>
              <p className="text-xs text-gray-500">P.O. Box 12345, Nairobi</p>
            </div>

            {/* Transaction Details */}
            <div className="mb-4 space-y-1">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{transactionDate.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{transactionDate.toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span>{receiptNumber}</span>
              </div>
            </div>

            <div className="border-t border-dashed my-4"></div>

            {/* Items - Scrollable if many items */}
            <div className="space-y-2 mb-4">
              {saleData.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <div className="flex-1">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-gray-400 ml-1">x{item.quantity}</span>
                  </div>
                  <span className="font-medium ml-2">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(saleData.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (16%):</span>
                <span>{formatCurrency(saleData.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-dashed pt-2 mt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(saleData.total)}</span>
              </div>
              <div className="flex justify-between text-xs pt-2">
                <span>Payment Method:</span>
                <span className="font-medium">{saleData.paymentMethod}</span>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 mt-6 border-t border-dashed pt-4">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </div>

        {/* Fixed Footer Buttons - Always visible */}
        <div className="p-4 border-t bg-gray-50 flex gap-3 print:hidden shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}