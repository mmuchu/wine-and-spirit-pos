 // src/components/pos/ReceiptModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "./utils";
import { settingsService } from "@/lib/services/settingsService";
import { useOrganization } from "@/lib/context/OrganizationContext"; // FIX: Import hook

interface Props {
  isOpen: boolean;
  onClose: () => void;
  saleData: any;
}

export function ReceiptModal({ isOpen, onClose, saleData }: Props) {
  const { organizationId } = useOrganization(); // FIX: Get ID from context
  const [settings, setSettings] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && organizationId) { // FIX: Wait for ID
      loadSettings();
    }
  }, [isOpen, organizationId]);

  const loadSettings = async () => {
    if (!organizationId) return; // Safety check
    const s = await settingsService.getSettings(organizationId); // FIX: Pass ID
    setSettings(s);
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Receipt</title>');
        printWindow.document.write('<style>body { font-family: monospace; padding: 20px; font-size: 12px; } h2 { margin-bottom: 5px; } hr { border: 0; border-top: 1px dashed #000; margin: 10px 0; } .right { text-align: right; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  if (!isOpen || !saleData || !settings) return null;

  const total = saleData.total || 0;
  const subtotal = saleData.subtotal || 0;
  const tax = saleData.tax || 0;
  const items = saleData.items || [];
  const date = new Date(saleData.date);
  const customer = saleData.customerName; 

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
      <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Header Actions */}
        <div className="p-3 border-b flex justify-between items-center shrink-0">
          <h2 className="font-bold">Receipt Preview</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-3 py-1 bg-black text-white rounded text-xs font-bold">
              Print
            </button>
            <button onClick={onClose} className="px-3 py-1 border rounded text-xs font-bold hover:bg-gray-100">
              Close
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex justify-center">
          
          {/* Receipt Container */}
          <div ref={printRef} className="bg-white p-6 shadow-md w-full font-mono text-sm border border-dashed">
            
            {/* Shop Header */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold">{settings.shop_name}</h2>
              <p className="text-xs">{settings.address}</p>
              {settings.phone && <p className="text-xs">Tel: {settings.phone}</p>}
              {settings.vat_number && <p className="text-xs mt-1 font-bold">VAT: {settings.vat_number}</p>}
            </div>

            <hr className="border-dashed mb-3" />

            {/* Meta Data */}
            <div className="flex justify-between text-xs mb-2">
              <span>Date:</span>
              <span>{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span>Receipt:</span>
              <span className="font-bold">{(saleData.id || 'DRAFT').toString().slice(0, 8).toUpperCase()}</span>
            </div>
             {customer && (
              <div className="flex justify-between text-xs mb-2">
                <span>Customer:</span>
                <span className="font-bold">{customer}</span>
              </div>
            )}
             <div className="flex justify-between text-xs mb-3">
              <span>Served by:</span>
              <span>Cashier</span>
            </div>

            <hr className="border-dashed mb-3" />

            {/* Items */}
            <div className="space-y-1 mb-3">
              {items.map((item: any) => (
                <div key={item.id} className="text-xs">
                  <div className="flex justify-between">
                    <span className="truncate w-32">{item.name}</span>
                    <span className="w-12 text-center">x{item.quantity}</span>
                    <span className="w-20 text-right">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <hr className="border-dashed my-3" />

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span>VAT (16%):</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <hr className="border-dashed my-4" />

            {/* Footer */}
            <div className="text-center text-xs space-y-1">
              <p>{settings.receipt_footer}</p>
              <p className="text-[10px] text-gray-500">Powered by NextPOS</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}