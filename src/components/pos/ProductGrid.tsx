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
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-[3/2] bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product) => {
        const category = getCategoryName(product);
        const styles = categoryStyles[category] || categoryStyles.default;
        const isAdded = justAddedId === product.id;

        return (
          <button
            key={product.id}
            onClick={() => onAdd(product)}
            className={`
              relative w-full text-left rounded-xl border-2 overflow-hidden
              transition-all duration-100 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              active:scale-[0.98] h-full flex flex-col
              ${isAdded 
                ? "ring-2 ring-blue-500 scale-[0.98] border-blue-400" 
                : `${styles.bg} ${styles.border} hover:shadow-md hover:border-gray-300`
              }
            `}
          >
            <div className={`h-1.5 w-full ${styles.bg.replace('50', '400')}`}></div>
            
            <div className="p-4 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-base font-bold text-gray-900 truncate leading-tight">
                    {product.name}
                  </h3>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${styles.bg} ${styles.text}`}>
                  {category}
                </span>
              </div>

              <div className="mt-auto pt-2 flex justify-between items-center">
                <p className={`text-xl font-extrabold ${styles.text.replace('900', '600')}`}>
                  {formatCurrency(product.price)}
                </p>
                
                {product.stock !== undefined && product.stock <= 10 && (
                  <span className="text-xs font-medium text-gray-400 bg-white/80 px-2 py-0.5 rounded">
                    {product.stock} left
                  </span>
                )}
              </div>
            </div>

            <div className={`
              absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-[2px] pointer-events-none
              transition-opacity duration-200
              ${isAdded ? "opacity-100" : "opacity-0"}
            `}>
              <span className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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