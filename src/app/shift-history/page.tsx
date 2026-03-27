 // src/app/shift-history/page.tsx
import { ShiftHistoryClient } from '@/components/stock/ShiftHistoryClient';

export const dynamic = 'force-dynamic';

export default function ShiftHistoryPage() {
  return <ShiftHistoryClient />;
}