 // src/components/pos/ProductGrid.tsx
"use client";

import { Product } from "@/lib/types";
import { getCategoryName, categoryColors, categoryAccents } from "./utils";

interface Props {
  products: Product[];
  isLoading: boolean;
  onAdd: (product: Product) => void;
  justAddedId: string | null;
}

export function ProductGrid({ products, isLoading, onAdd, justAddedId }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product, index) => {
        const category = getCategoryName(product);
        const gradientClass = categoryColors[category] || categoryColors.default;
        const accentClass = categoryAccents[category] || categoryAccents.default;
        const isJustAdded = justAddedId === product.id;

        return (
          <button
            key={product.id}
            onClick={() => onAdd(product)}
            disabled={product.stock === 0}
            className={`group relative aspect-[3/4] rounded-2xl border bg-gradient-to-br ${gradientClass} ${accentClass} p-4 flex flex-col justify-between text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
              isJustAdded ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
            } animate-fade-in-up opacity-0`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Stock Badge */}
            {product.stock === 0 ? (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-destructive/80 text-destructive-foreground text-[10px] font-bold uppercase tracking-wide">
                Out of Stock
              </div>
            ) : product.stock <= 5 ? (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold uppercase tracking-wide">
                Low Stock
              </div>
            ) : null}

            {/* Icon Container */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-16 h-20 rounded-lg bg-background/40 backdrop-blur border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl opacity-80 group-hover:opacity-100 transition-opacity">
                    🍷
                  </span>
                )}
              </div>
            </div>

            {/* Info Footer */}
            <div className="space-y-1.5 pt-2">
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">{category}</p>
                <h3 className="font-bold text-white truncate text-sm">{product.name}</h3>
                {product.sku && <p className="text-[10px] text-white/40 font-mono">{product.sku}</p>}
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-lg font-bold text-primary">${product.price.toFixed(2)}</p>
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                  <svg className="w-3.5 h-3.5 text-white group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}