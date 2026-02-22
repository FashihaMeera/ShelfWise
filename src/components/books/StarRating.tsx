import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-6 w-6" };

export function StarRating({ rating, onRate, size = "md", className }: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onRate}
          onClick={() => onRate?.(star)}
          className={cn("transition-colors", onRate && "cursor-pointer hover:scale-110")}
        >
          <Star
            className={cn(
              sizes[size],
              star <= rating
                ? "fill-[hsl(var(--warning))] text-[hsl(var(--warning))]"
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}
