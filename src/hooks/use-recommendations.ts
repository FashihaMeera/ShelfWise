import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Book } from "@/hooks/use-books";

/**
 * Recommend books based on the user's reading history.
 * Strategy: Find genres/authors the user has borrowed, then suggest unread books from those.
 */
export function useBookRecommendations(limit = 6) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["book-recommendations", user?.id],
        enabled: !!user,
        queryFn: async () => {
            // 1. Get user's borrowing history
            const { data: borrowings } = await supabase
                .from("borrowings")
                .select("book_id, books(genre, author)")
                .eq("user_id", user!.id);

            if (!borrowings?.length) {
                // No history: return popular books (most borrowed)
                const { data: popular } = await supabase
                    .from("books")
                    .select("*")
                    .gt("available_copies", 0)
                    .order("total_copies", { ascending: false })
                    .limit(limit);
                return (popular || []) as Book[];
            }

            // 2. Extract preferred genres and authors
            const genres = new Set<string>();
            const authors = new Set<string>();
            const readBookIds = new Set<string>();

            for (const b of borrowings) {
                readBookIds.add(b.book_id);
                const book = b.books as any;
                if (book?.genre) genres.add(book.genre);
                if (book?.author) authors.add(book.author);
            }

            // 3. Find books matching preferences that user hasn't read
            const genreArray = [...genres];
            const authorArray = [...authors];

            let query = supabase
                .from("books")
                .select("*")
                .gt("available_copies", 0)
                .limit(limit * 2); // Get extra to filter out read books

            if (genreArray.length > 0) {
                query = query.in("genre", genreArray);
            }

            const { data: candidates } = await query;

            // Filter out already-read books and prioritize
            const unread = (candidates || [])
                .filter((b: any) => !readBookIds.has(b.id))
                .sort((a: any, b: any) => {
                    // Prioritize: same author > same genre > others
                    const aAuthorMatch = authors.has(a.author) ? 2 : 0;
                    const bAuthorMatch = authors.has(b.author) ? 2 : 0;
                    const aGenreMatch = genres.has(a.genre) ? 1 : 0;
                    const bGenreMatch = genres.has(b.genre) ? 1 : 0;
                    return (bAuthorMatch + bGenreMatch) - (aAuthorMatch + aGenreMatch);
                })
                .slice(0, limit);

            return unread as Book[];
        },
    });
}
