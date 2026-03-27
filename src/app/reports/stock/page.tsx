 // src/app/reports/stock/page.tsx
import { StockReturnClient } from '@/components/stock/StockReturnClient';

export const dynamic = 'force-dynamic';

export default function StockReturnPage() {
  return <StockReturnClient />;
}