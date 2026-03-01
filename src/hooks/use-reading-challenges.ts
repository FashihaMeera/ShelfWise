import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface ReadingChallenge {
    id: string;
    user_id: string;
    title: string;
    target_books: number;
    start_date: string;
    end_date: string;
    created_at: string;
}

export function useReadingChallenges() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["reading-challenges", user?.id],
        enabled: !!user,
        queryFn: () => api.get<ReadingChallenge[]>("/api/reading-challenges"),
    });
}

/** Count books the user has returned in a date range */
export function useBooksReadInRange(startDate: string, endDate: string) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["books-read", user?.id, startDate, endDate],
        enabled: !!user && !!startDate && !!endDate,
        queryFn: () =>
            api.get<number>(
                `/api/reading-challenges/books-count?start_date=${startDate}&end_date=${endDate}`
            ),
    });
}

export function useCreateChallenge() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (challenge: { user_id: string; title: string; target_books: number; start_date: string; end_date: string }) => {
            await api.post("/api/reading-challenges", challenge);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reading-challenges"] });
            toast({ title: "Challenge created! 🎯" });
        },
        onError: (e: any) => toast({ title: "Failed to create challenge", description: e.message, variant: "destructive" }),
    });
}

export function useDeleteChallenge() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/reading-challenges/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reading-challenges"] });
            toast({ title: "Challenge removed" });
        },
        onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
    });
}
