import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "./StarRating";
import { useBookReviews, useAddReview, useDeleteReview } from "@/hooks/use-reviews";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

interface ReviewSectionProps {
  bookId: string;
}

export function ReviewSection({ bookId }: ReviewSectionProps) {
  const { user } = useAuth();
  const { data: reviews, isLoading } = useBookReviews(bookId);
  const addReview = useAddReview();
  const deleteReview = useDeleteReview();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  const hasReviewed = reviews?.some((r) => r.user_id === user?.id);

  const handleSubmit = () => {
    if (!user || !rating) return;
    addReview.mutate(
      { book_id: bookId, user_id: user.id, rating, review_text: text || undefined },
      { onSuccess: () => { setRating(0); setText(""); } }
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Reviews</h3>

      {!hasReviewed && user && (
        <div className="glass rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Write a review</p>
          <StarRating rating={rating} onRate={setRating} />
          <Textarea
            placeholder="Share your thoughts (optional)..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <Button size="sm" onClick={handleSubmit} disabled={!rating || addReview.isPending}>
            Submit Review
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading reviews...</p>
      ) : !reviews?.length ? (
        <p className="text-muted-foreground text-sm">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="glass rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={r.reviewer_avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {(r.reviewer_name || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{r.reviewer_name || "Anonymous"}</p>
                    <StarRating rating={r.rating} size="sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                  {r.user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteReview.mutate({ id: r.id, bookId })}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              {r.review_text && <p className="text-sm text-muted-foreground mt-2">{r.review_text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
