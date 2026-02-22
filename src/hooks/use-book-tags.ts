import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
        queryFn: async () => {
            const { data, error } = await supabase
                .from("book_tags" as any)
                .select("*")
                .eq("book_id", bookId!)
                .order("tag");
            if (error) throw error;
            return (data || []) as unknown as BookTag[];
        },
    });
}

/** Get all unique tags across all books (for autocomplete) */
export function useAllTags() {
    return useQuery({
        queryKey: ["all-tags"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("book_tags" as any)
                .select("tag")
                .order("tag");
            if (error) throw error;
            const tags = [...new Set((data || []).map((t: any) => t.tag as string))];
            return tags;
        },
    });
}

/** Add a tag to a book */
export function useAddBookTag() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ bookId, tag }: { bookId: string; tag: string }) => {
            const { error } = await supabase
                .from("book_tags" as any)
                .insert({ book_id: bookId, tag: tag.trim().toLowerCase() } as any);
            if (error) throw error;
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
            const { error } = await supabase
                .from("book_tags" as any)
                .delete()
                .eq("id", tagId);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["book-tags", variables.bookId] });
            qc.invalidateQueries({ queryKey: ["all-tags"] });
        },
    });
}
