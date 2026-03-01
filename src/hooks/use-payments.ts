import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Fine {
  id: string;
  borrowing_id: string;
  user_id: string;
  amount: number;
  paid: boolean;
  paid_at?: string;
  payment_method?: string;
  waived: boolean;
  waived_at?: string;
  created_at: string;
}

export function useUserFines() {
  return useQuery({
    queryKey: ["user-fines"],
    queryFn: () => api.get<Fine[]>("/api/payments/fines"),
  });
}

export function useCreatePaymentIntent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (fineId: string) => {
      return api.post(`/api/payments/${fineId}/stripe-intent`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-fines"] });
    },
  });
}

export function useConfirmStripePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      return api.post(`/api/payments/${paymentId}/confirm-stripe`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-fines"] });
    },
  });
}

export function useRecordCashPayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (fineId: string) => {
      return api.post(`/api/payments/${fineId}/cash-payment`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-fines"] });
    },
  });
}
