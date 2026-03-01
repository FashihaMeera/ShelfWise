import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export function useLibrarySettings() {
  return useQuery({
    queryKey: ["library-settings"],
    queryFn: () => api.get<Record<string, string>>("/api/settings"),
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put(`/api/settings/${key}`, { value });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library-settings"] });
      toast({ title: "Setting updated" });
    },
    onError: (e) => toast({ title: "Failed to update setting", description: e.message, variant: "destructive" }),
  });
}
