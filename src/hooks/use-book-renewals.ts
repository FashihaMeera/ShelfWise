import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface RenewBookResponse {
  message: string;
  new_due_date: string;
  renewals_count: number;
}

export function useBookRenewals() {
  const qc = useQueryClient();

  const renewBook = useMutation<RenewBookResponse, Error, string>({
    mutationFn: async (borrowingId: string) => {
      return api.post<RenewBookResponse>(`/api/borrowings/${borrowingId}/renew`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrowings"] });
    },
  });

  return { renewBook };
}
