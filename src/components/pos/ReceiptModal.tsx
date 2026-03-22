 // src/components/pos/ReceiptModal.tsx
"use client";

import { useRef } from "react";
import { formatCurrency } from "@/components/pos/utils";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: any;
}

export function ReceiptModal({ isOpen, onClose, saleData }: ReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !saleData) return null;

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=600,width=300');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Receipt</title>');
        printWindow.document.write('<style>body { font-family: monospace; font-size: 12px; padding: 10px; } .text-right { text-align: right; } .font-bold { font-weight: bold; } .mt-2 { margin-top: 8px; } .border-t { border-top: 1px dashed #000; padding-top: 8px; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg">Receipt</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Receipt Content */}
        <div ref={printRef} className="p-6 text-sm space-y-4 bg-white text-gray-800">
          
          {/* Shop Details */}
          <div className="text-center border-b pb-4">
            <h2 className="font-extrabold text-xl">KENYAN SPIRIT</h2>
            <p className="text-xs text-gray-500">Lounge & Bistro</p>
            <p className="text-xs text-gray-500">Nairobi, Kenya</p>
            <p className="text-xs text-gray-500 mt-1">{new Date(saleData.date).toLocaleString()}</p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {saleData.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-400 text-xs ml-1">x{item.quantity}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(saleData.subtotal || 0)}</span>
            </div>
            
            {saleData.tax_amount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>VAT (16%)</span>
                <span>{formatCurrency(saleData.tax_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-extrabold border-t pt-2 mt-2">
              <span>TOTAL</span>
              <span>{formatCurrency(saleData.total_amount)}</span>
            </div>
            
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Method</span>
              <span className="uppercase">{saleData.payment_method}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            <p>Thank you for your business!</p>
            <p>Powered by Kenyan Spirit POS</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex-1 py-3 bg-black text-white rounded-lg font-bold text-sm"
          >
            Print Receipt
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-3 border border-gray-300 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}