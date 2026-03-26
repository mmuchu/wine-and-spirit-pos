 // src/components/pos/BarcodeScanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Initialize Scanner
    const html5QrCode = new Html5Qrcode("barcode-reader");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" }, // Use back camera
      config,
      (decodedText) => {
        // Success Callback
        onScan(decodedText);
        html5QrCode.stop().then(() => {
          // Scanner stopped
        }).catch((err) => console.error("Stop error", err));
      },
      (errorMessage) => {
        // Ignore frequent scan errors (no QR code found)
      }
    ).catch((err) => {
      setError("Could not access camera. Please ensure camera permissions are granted.");
      console.error("Camera init error:", err);
    });

    // Cleanup on unmount
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err) => console.error("Cleanup error", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 bg-black text-white flex justify-between items-center">
          <h3 className="font-bold">Scan Barcode</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white font-bold text-xl">&times;</button>
        </div>
        
        <div className="p-4">
          {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}
          <div id="barcode-reader" className="w-full overflow-hidden rounded-lg border"></div>
          <p className="text-xs text-gray-400 text-center mt-2">Point camera at barcode</p>
        </div>
      </div>
    </div>
  );
}