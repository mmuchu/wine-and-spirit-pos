 // src/components/pos/ProductGrid.tsx
"use client";

import { Product } from "@/lib/types";
import { formatCurrency, getCategoryName, categoryStyles } from "./utils";

interface Props {
  products: Product[];
  isLoading: boolean;
  onAdd: (product: Product) => void;
  justAddedId: string | null;
}

export function ProductGrid({ products, isLoading, onAdd, justAddedId }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-[3/2] bg-gray-50 rounded-2xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-5">
      {products.map((product) => {
        const category = getCategoryName(product);
        const styles = categoryStyles[category] || categoryStyles.default;
        const isAdded = justAddedId === product.id;
        const minStock = product.min_stock ?? 10;
        const isLow = product.stock < minStock;

        return (
          <button
            key={product.id}
            onClick={() => onAdd(product)}
            className={`
              relative w-full text-left rounded-2xl overflow-hidden border-2
              transition-all duration-200 ease-out transform-gpu
              focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
              active:scale-[0.97]
              group
              ${isAdded 
                ? "ring-2 ring-black scale-[0.97] border-gray-800" 
                : `${styles.bg} ${styles.border} hover:shadow-xl hover:border-gray-300 hover:-translate-y-1`
              }
            `}
          >
            {/* Top Color Strip */}
            <div className={`h-2 w-full transition-opacity ${isAdded ? 'bg-black' : styles.strip}`}></div>
            
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-base font-bold text-gray-900 leading-tight tracking-tight">
                    {product.name}
                  </h3>
                </div>
                <span className={`shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${styles.badge} shadow-sm`}>
                  {category}
                </span>
              </div>

              {/* Stock & Price Row */}
              <div className="mt-4 flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-400 font-medium">STOCK</p>
                  <p className={`text-lg font-bold ${isLow ? 'text-red-500' : 'text-gray-800'}`}>
                    {product.stock}
                  </p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-gray-400 font-medium">PRICE</p>
                   <p className="text-xl font-extrabold tracking-tighter text-gray-900">
                     {formatCurrency(product.price)}
                   </p>
                </div>
              </div>
            </div>

            {/* Add Feedback Overlay */}
            <div className={`
              absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm pointer-events-none
              transition-opacity duration-300
              ${isAdded ? "opacity-100" : "opacity-0"}
            `}>
              <span className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Added
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}