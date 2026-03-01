import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useReadingList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reading-list", user?.id],
    queryFn: () => api.get<any[]>("/api/reading-lists"),
    enabled: !!user,
  });
}

export function useIsInReadingList(bookId: string) {
  const { data } = useReadingList();
  return data?.some((item: any) => item.book_id === bookId) ?? false;
}

export function useToggleReadingList() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ bookId, isInList }: { bookId: string; isInList: boolean }) => {
      if (isInList) {
        await api.delete(`/api/reading-lists/${bookId}`);
      } else {
        await api.post("/api/reading-lists", { book_id: bookId });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reading-list"] });
      toast({ title: vars.isInList ? "Removed from reading list" : "Added to reading list" });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
