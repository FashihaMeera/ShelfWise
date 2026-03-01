import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface WaitlistEntry {
    id: string;
    book_id: string;
    user_id: string;
    position: number;
    notified: boolean;
    created_at: string;
}

/** Get waitlist entries for a specific book */
export function useBookWaitlist(bookId: string | undefined) {
    return useQuery({
        queryKey: ["waitlist", bookId],
        enabled: !!bookId,
        queryFn: () => api.get<WaitlistEntry[]>(`/api/waitlist/${bookId}`),
    });
}

/** Check if the current user is on the waitlist */
export function useIsOnWaitlist(bookId: string | undefined) {
    const { user } = useAuth();
    const { data: waitlist } = useBookWaitlist(bookId);
    return waitlist?.find((w) => w.user_id === user?.id) || null;
}

/** Join the waitlist for a book */
export function useJoinWaitlist() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ bookId, userId }: { bookId: string; userId: string }) => {
            await api.post("/api/waitlist", { book_id: bookId, user_id: userId });
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["waitlist", variables.bookId] });
            toast({ title: "Added to waitlist!", description: "We'll notify you when this book is available." });
        },
        onError: (e: any) => {
            if (e.message?.includes("duplicate")) {
                toast({ title: "Already on waitlist", variant: "destructive" });
            } else {
                toast({ title: "Failed to join waitlist", description: e.message, variant: "destructive" });
            }
        },
    });
}

/** Leave the waitlist */
export function useLeaveWaitlist() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ bookId, userId }: { bookId: string; userId: string }) => {
            await api.delete(`/api/waitlist/${bookId}/${userId}`);
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["waitlist", variables.bookId] });
            toast({ title: "Removed from waitlist" });
        },
        onError: (e: any) => {
            toast({ title: "Failed to leave waitlist", description: e.message, variant: "destructive" });
        },
    });
}
