import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export interface BookTag {
    id: string;
    book_id: string;
    tag: string;
    created_at: string;
}

/** Get all tags for a specific book */
export function useBookTags(bookId: string | undefined) {
    return useQuery({
        queryKey: ["book-tags", bookId],
        enabled: !!bookId,
        queryFn: () => api.get<BookTag[]>(`/api/book-tags/${bookId}`),
    });
}

/** Get all unique tags across all books (for autocomplete) */
export function useAllTags() {
    return useQuery({
        queryKey: ["all-tags"],
        queryFn: () => api.get<string[]>("/api/book-tags/all/unique"),
    });
}

/** Add a tag to a book */
export function useAddBookTag() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ bookId, tag }: { bookId: string; tag: string }) => {
            await api.post("/api/book-tags", { book_id: bookId, tag: tag.trim().toLowerCase() });
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["book-tags", variables.bookId] });
            qc.invalidateQueries({ queryKey: ["all-tags"] });
        },
        onError: (e: any) => {
            if (e.message?.includes("duplicate")) {
                toast({ title: "Tag already exists", variant: "destructive" });
            } else {
                toast({ title: "Failed to add tag", description: e.message, variant: "destructive" });
            }
        },
    });
}

/** Remove a tag from a book */
export function useRemoveBookTag() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ bookId, tagId }: { bookId: string; tagId: string }) => {
            await api.delete(`/api/book-tags/${tagId}`);
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["book-tags", variables.bookId] });
            qc.invalidateQueries({ queryKey: ["all-tags"] });
        },
    });
}
