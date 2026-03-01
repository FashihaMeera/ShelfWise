import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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
    queryFn: () => api.get<Review[]>(`/api/reviews/${bookId}`),
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
      await api.post("/api/reviews", data);
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
      await api.delete(`/api/reviews/${id}`);
      return bookId;
    },
    onSuccess: (bookId) => {
      qc.invalidateQueries({ queryKey: ["book-reviews", bookId] });
      toast({ title: "Review deleted" });
    },
    onError: (e) => toast({ title: "Failed to delete review", description: e.message, variant: "destructive" }),
  });
}
