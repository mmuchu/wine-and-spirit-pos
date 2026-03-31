 // src/components/pos/utils.ts

export function formatCurrency(amount: number | undefined | null): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return "Ksh 0.00";
  }

  // FIX: Force 2 decimal places (e.g., 1000 becomes Ksh 1,000.00)
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCategoryName(product: any): string {
  if (product.categories && typeof product.categories === 'object') {
    return product.categories.name || 'Uncategorized';
  }
  return 'Uncategorized';
}

// Beautiful, high-contrast colors
export const categoryStyles: Record<string, { bg: string; border: string; text: string; strip: string; badge: string }> = {
  "Spirits": { 
    bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-900", 
    strip: "bg-violet-500", badge: "bg-violet-100 text-violet-700" 
  },
  "Beers": { 
    bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-900", 
    strip: "bg-amber-500", badge: "bg-amber-100 text-amber-700" 
  },
  "Wines": { 
    bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-900", 
    strip: "bg-rose-500", badge: "bg-rose-100 text-rose-700" 
  },
  "Soft Drinks": { 
    bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-900", 
    strip: "bg-sky-500", badge: "bg-sky-100 text-sky-700" 
  },
  "Snacks": { 
    bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-900", 
    strip: "bg-orange-500", badge: "bg-orange-100 text-orange-700" 
  },
  "default": { 
    bg: "bg-gray-50", border: "border-gray-100", text: "text-gray-900", 
    strip: "bg-gray-500", badge: "bg-gray-100 text-gray-700" 
  }
};