// src/components/pos/utils.ts
import { Product } from "@/lib/types";

export const getCategoryName = (product: Product): string => {
  if (!product.categories) return "Other";
  if (Array.isArray(product.categories)) {
    return product.categories[0]?.name || "Other";
  }
  return product.categories.name || "Other";
};

export const categoryColors: Record<string, string> = {
  Whisky: "from-amber-600/20 to-amber-800/20",
  Champagne: "from-rose-600/20 to-rose-800/20",
  Vodka: "from-sky-600/20 to-sky-800/20",
  Tequila: "from-emerald-600/20 to-emerald-800/20",
  Cognac: "from-orange-600/20 to-orange-800/20",
  default: "from-muted/40 to-muted",
};

export const categoryAccents: Record<string, string> = {
  Whisky: "border-amber-500/30 hover:border-amber-500/50",
  Champagne: "border-rose-500/30 hover:border-rose-500/50",
  Vodka: "border-sky-500/30 hover:border-sky-500/50",
  Tequila: "border-emerald-500/30 hover:border-emerald-500/50",
  Cognac: "border-orange-500/30 hover:border-orange-500/50",
  default: "border-border hover:border-border/80",
};