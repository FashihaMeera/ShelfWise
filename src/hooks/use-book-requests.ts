import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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
            const params = new URLSearchParams();
            if (type) params.set("type", type);
            const qs = params.toString();
            return api.get<BookRequest[]>(`/api/book-requests${qs ? `?${qs}` : ""}`);
        },
    });
}

export function useCreateBookRequest() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (req: { user_id: string; title: string; author?: string; reason?: string; type: string }) => {
            await api.post("/api/book-requests", req);
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
            await api.put(`/api/book-requests/${id}`, { status });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["book-requests"] });
            toast({ title: "Status updated" });
        },
        onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
    });
}
