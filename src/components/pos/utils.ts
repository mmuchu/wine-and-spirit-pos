 // src/components/pos/utils.ts

export function formatCurrency(amount: number | undefined | null): string {
  // Safety check: if amount is not a valid number, return 0.00
  if (typeof amount !== 'number' || isNaN(amount)) {
    return "Ksh 0.00";
  }

  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}

export function getCategoryName(product: any): string {
  if (product.categories && typeof product.categories === 'object') {
    return product.categories.name || 'Uncategorized';
  }
  return 'Uncategorized';
}

// Smart Colors for Categories
export const categoryStyles: Record<string, { bg: string; border: string; text: string }> = {
  "Spirits": { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900" },
  "Beers": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900" },
  "Wines": { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900" },
  "Soft Drinks": { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-900" },
  "Snacks": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900" },
  "default": { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-900" }
};