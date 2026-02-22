import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export function useBookReviews(bookId: string) {
  return useQuery({
    queryKey: ["book-reviews", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_reviews")
        .select("*, profiles!book_reviews_user_id_fkey(full_name, avatar_url)")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });
      if (error) {
        // If FK doesn't exist, fallback
        const { data: d2, error: e2 } = await supabase
          .from("book_reviews")
          .select("*")
          .eq("book_id", bookId)
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        return d2 as Review[];
      }
      return data.map((r: any) => ({
        ...r,
        reviewer_name: r.profiles?.full_name || "Anonymous",
        reviewer_avatar: r.profiles?.avatar_url,
      })) as Review[];
    },
    enabled: !!bookId,
  });
}

export function useAverageRating(bookId: string) {
  const { data: reviews } = useBookReviews(bookId);
  if (!reviews?.length) return { average: 0, count: 0 };
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return { average: Math.round(avg * 10) / 10, count: reviews.length };
}

export function useAddReview() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { book_id: string; user_id: string; rating: number; review_text?: string }) => {
      const { error } = await supabase.from("book_reviews").insert(data);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["book-reviews", vars.book_id] });
      toast({ title: "Review submitted" });
    },
    onError: (e) => toast({ title: "Failed to submit review", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, bookId }: { id: string; bookId: string }) => {
      const { error } = await supabase.from("book_reviews").delete().eq("id", id);
      if (error) throw error;
      return bookId;
    },
    onSuccess: (bookId) => {
      qc.invalidateQueries({ queryKey: ["book-reviews", bookId] });
      toast({ title: "Review deleted" });
    },
    onError: (e) => toast({ title: "Failed to delete review", description: e.message, variant: "destructive" }),
  });
}
