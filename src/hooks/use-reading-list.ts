import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useReadingList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reading-list", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("reading_lists")
        .select("*, books(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ bookId, isInList }: { bookId: string; isInList: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isInList) {
        const { error } = await supabase
          .from("reading_lists")
          .delete()
          .eq("user_id", user.id)
          .eq("book_id", bookId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reading_lists")
          .insert({ user_id: user.id, book_id: bookId });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reading-list"] });
      toast({ title: vars.isInList ? "Removed from reading list" : "Added to reading list" });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
