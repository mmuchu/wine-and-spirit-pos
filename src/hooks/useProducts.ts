// src/hooks/useProducts.ts
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";

// Demo data for development/fallback
const fallbackProducts: Product[] = [
  { id: "1", organization_id: "org-1", category_id: "cat-1", name: "Macallan 18", price: 299.99, sku: "WHI-001", stock: 12, image_url: null, is_active: true, categories: { name: "Whisky" } },
  { id: "2", organization_id: "org-1", category_id: "cat-2", name: "Dom Pérignon 2012", price: 189.99, sku: "CHA-001", stock: 8, image_url: null, is_active: true, categories: { name: "Champagne" } },
  { id: "3", organization_id: "org-1", category_id: "cat-3", name: "Grey Goose VX", price: 64.99, sku: "VOD-001", stock: 24, image_url: null, is_active: true, categories: { name: "Vodka" } },
  { id: "4", organization_id: "org-1", category_id: "cat-4", name: "Don Julio 1942", price: 159.99, sku: "TEQ-001", stock: 15, image_url: null, is_active: true, categories: { name: "Tequila" } },
  { id: "5", organization_id: "org-1", category_id: "cat-5", name: "Hennessy X.O", price: 199.99, sku: "COG-001", stock: 10, image_url: null, is_active: true, categories: { name: "Cognac" } },
  { id: "6", organization_id: "org-1", category_id: "cat-1", name: "Lagavulin 16", price: 119.99, sku: "WHI-002", stock: 18, image_url: null, is_active: true, categories: { name: "Whisky" } },
  { id: "7", organization_id: "org-1", category_id: "cat-2", name: "Moët & Chandon", price: 54.99, sku: "CHA-002", stock: 30, image_url: null, is_active: true, categories: { name: "Champagne" } },
  { id: "8", organization_id: "org-1", category_id: "cat-3", name: "Crystal Head Aurora", price: 89.99, sku: "VOD-002", stock: 20, image_url: null, is_active: true, categories: { name: "Vodka" } },
  { id: "9", organization_id: "org-1", category_id: "cat-4", name: "Clase Azul Reposado", price: 169.99, sku: "TEQ-002", stock: 9, image_url: null, is_active: true, categories: { name: "Tequila" } },
  { id: "10", organization_id: "org-1", category_id: "cat-5", name: "Remy Martin Louis XIII", price: 3499.99, sku: "COG-002", stock: 2, image_url: null, is_active: true, categories: { name: "Cognac" } },
];

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("products")
        .select(`id, organization_id, category_id, name, price, sku, stock, image_url, is_active, categories ( name )`)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      const transformedData = data?.map((item) => ({ ...item, price: Number(item.price) })) || [];
      setProducts(transformedData);
      setError(null);
    } catch (err) {
      console.error("Supabase fetch failed:", err);
      setError("Failed to load products. Check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFallback = () => {
    setProducts(fallbackProducts);
    setError(null);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return { products, isLoading, error, loadFallback, refresh: fetchProducts };
}