import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BookRequest {
    id: string;
    user_id: string;
    title: string;
    author: string | null;
    reason: string | null;
    type: "donation" | "request";
    status: "pending" | "approved" | "rejected" | "fulfilled";
    created_at: string;
    profiles?: { full_name: string | null };
}

export function useBookRequests(type?: string) {
    return useQuery({
        queryKey: ["book-requests", type],
        queryFn: async () => {
            let query = supabase
                .from("book_requests" as any)
                .select("*, profiles(full_name)")
                .order("created_at", { ascending: false });
            if (type) query = query.eq("type", type);
            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as unknown as BookRequest[];
        },
    });
}

export function useCreateBookRequest() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (req: { user_id: string; title: string; author?: string; reason?: string; type: string }) => {
            const { error } = await supabase
                .from("book_requests" as any)
                .insert(req as any);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["book-requests"] });
            toast({ title: "Request submitted!" });
        },
        onError: (e: any) => toast({ title: "Failed to submit", description: e.message, variant: "destructive" }),
    });
}

export function useUpdateBookRequestStatus() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase
                .from("book_requests" as any)
                .update({ status } as any)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["book-requests"] });
            toast({ title: "Status updated" });
        },
        onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
    });
}
