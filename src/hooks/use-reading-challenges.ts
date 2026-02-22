import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
        queryFn: async () => {
            const { data, error } = await supabase
                .from("reading_challenges" as any)
                .select("*")
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []) as unknown as ReadingChallenge[];
        },
    });
}

/** Count books the user has returned in a date range */
export function useBooksReadInRange(startDate: string, endDate: string) {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["books-read", user?.id, startDate, endDate],
        enabled: !!user && !!startDate && !!endDate,
        queryFn: async () => {
            const { count, error } = await supabase
                .from("borrowings")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user!.id)
                .not("returned_at", "is", null)
                .gte("returned_at", startDate)
                .lte("returned_at", endDate + "T23:59:59");
            if (error) throw error;
            return count || 0;
        },
    });
}

export function useCreateChallenge() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (challenge: { user_id: string; title: string; target_books: number; start_date: string; end_date: string }) => {
            const { error } = await supabase
                .from("reading_challenges" as any)
                .insert(challenge as any);
            if (error) throw error;
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
            const { error } = await supabase
                .from("reading_challenges" as any)
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reading-challenges"] });
            toast({ title: "Challenge removed" });
        },
        onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
    });
}
