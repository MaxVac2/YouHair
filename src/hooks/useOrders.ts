import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CartItem } from "@/contexts/CartContext";

export function useOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (items: CartItem[]) => {
      if (!user) throw new Error("Not signed in");
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({ user_id: user.id, total, status: "paid" })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const rows = items.map((i) => ({
        order_id: order.id,
        product_id: i.id,
        product_name: i.name,
        unit_price: i.price,
        quantity: i.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;
      return order;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}
