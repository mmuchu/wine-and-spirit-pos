 // src/app/reports/stock/page.tsx
import { Suspense } from 'react';
import { StockReturnClient } from '@/components/stock/StockReturnClient';

export const dynamic = 'force-dynamic';

export default function StockReturnPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <StockReturnClient />
    </Suspense>
  );
}