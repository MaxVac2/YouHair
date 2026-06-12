import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;

// `stock` is intentionally excluded — internal inventory data must not be exposed to clients.
const PUBLIC_PRODUCT_COLUMNS =
  "id,name,slug,description,price,category,image_url,hair_types,concerns,created_at,updated_at";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PUBLIC_PRODUCT_COLUMNS)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Product[];
    },
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Product | null;
    },
    enabled: !!slug,
  });
}
