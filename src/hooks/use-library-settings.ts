import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useLibrarySettings() {
  return useQuery({
    queryKey: ["library-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("library_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library-settings"] });
      toast({ title: "Setting updated" });
    },
    onError: (e) => toast({ title: "Failed to update setting", description: e.message, variant: "destructive" }),
  });
}
