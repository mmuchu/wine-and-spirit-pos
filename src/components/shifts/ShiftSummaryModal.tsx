// src/components/shifts/ShiftSummaryModal.tsx
"use client";

import { formatCurrency } from "@/components/pos/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shiftData: any; // The shift object with all details
  salesData: any[]; // List of sales during shift
}

export function ShiftSummaryModal({ isOpen, onClose, shiftData, salesData }: Props) {
  if (!isOpen || !shiftData) return null;

  // Calculate Totals from salesData
  const cashSales = salesData.filter(s => s.payment_method === 'Cash').reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const mpesaSales = salesData.filter(s => s.payment_method === 'M-Pesa').reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const creditSales = salesData.filter(s => s.payment_method === 'Credit').reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalSales = cashSales + mpesaSales + creditSales;

  const expectedCash = (shiftData.opening_cash || 0) + cashSales;
  const actualCash = shiftData.closing_cash || 0;
  const variance = actualCash - expectedCash;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
      <div className="bg-white rounded-lg w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col print:shadow-none print:max-h-full print:w-full">
        
        {/* Header - Hidden on print */}
        <div className="p-4 border-b flex justify-between items-center shrink-0 print:hidden">
          <h2 className="font-bold">Shift Closed</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-3 py-1 bg-black text-white rounded text-xs font-bold">
              Print
            </button>
            <button onClick={onClose} className="px-3 py-1 border rounded text-xs font-bold hover:bg-gray-100">
              Close
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">Shift Report</h1>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(shiftData.closed_at).toLocaleString()}
            </p>
          </div>

          <div className="border-b border-dashed pb-4 mb-4">
            <div className="flex justify-between mb-1">
              <span>Opening Cash:</span>
              <span>{formatCurrency(shiftData.opening_cash)}</span>
            </div>
          </div>

          <div className="border-b border-dashed pb-4 mb-4">
            <h3 className="font-bold mb-2">Sales Breakdown</h3>
            <div className="flex justify-between mb-1">
              <span>Cash Sales:</span>
              <span>{formatCurrency(cashSales)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>M-Pesa Sales:</span>
              <span>{formatCurrency(mpesaSales)}</span>
            </div>
            <div className="flex justify-between mb-1 text-orange-600">
              <span>Credit Sales:</span>
              <span>{formatCurrency(creditSales)}</span>
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t font-bold">
              <span>Total Sales:</span>
              <span>{formatCurrency(totalSales)}</span>
            </div>
          </div>

          <div className="border-b border-dashed pb-4 mb-4">
            <h3 className="font-bold mb-2">Cash Reconciliation</h3>
            <div className="flex justify-between mb-1">
              <span>Expected Cash:</span>
              <span>{formatCurrency(expectedCash)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Actual Cash:</span>
              <span>{formatCurrency(actualCash)}</span>
            </div>
            <div className={`flex justify-between mt-2 pt-2 border-t font-bold ${variance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              <span>Variance:</span>
              <span>{formatCurrency(variance)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 mt-8">
            <p>Powered by Kenyan Spirit POS</p>
          </div>
        </div>
      </div>
    </div>
  );
}