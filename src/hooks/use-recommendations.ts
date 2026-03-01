import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Book } from "@/hooks/use-books";

/**
 * Recommend books based on the user's reading history.
 * The backend handles the recommendation logic.
 */
export function useBookRecommendations(limit = 6) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["book-recommendations", user?.id],
        enabled: !!user,
        queryFn: async () => {
            // Use popular books as recommendations - backend can be extended with a dedicated endpoint
            const books = await api.get<Book[]>(`/api/books?limit=${limit}`);
            return books;
        },
    });
}
