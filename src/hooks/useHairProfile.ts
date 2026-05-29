import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type HairProfile = Tables<"hair_profiles">;

export function useHairProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hair_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hair_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as HairProfile | null;
    },
    enabled: !!user,
  });
}

export function useSaveHairProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"hair_profiles">, "user_id">) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("hair_profiles")
        .upsert({ ...input, user_id: user.id }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hair_profile"] }),
  });
}
