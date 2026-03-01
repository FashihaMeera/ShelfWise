import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface SuspensionStatus {
  is_suspended: boolean;
  suspension_reason?: string;
  suspended_at?: string;
  suspended_until?: string;
}

export function useMemberSuspensionStatus(memberId: string) {
  return useQuery<SuspensionStatus>({
    queryKey: ["suspension-status", memberId],
    queryFn: () => api.get<SuspensionStatus>(`/api/members/${memberId}/suspension-status`),
  });
}

export function useSuspendMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      reason,
    }: {
      memberId: string;
      reason: string;
    }) => {
      return api.post(`/api/members/${memberId}/suspend`, { member_id: memberId, reason });
    },
    onSuccess: (_, { memberId }) => {
      qc.invalidateQueries({ queryKey: ["suspension-status", memberId] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useUnsuspendMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      return api.post(`/api/members/${memberId}/unsuspend`, {});
    },
    onSuccess: (_, memberId) => {
      qc.invalidateQueries({ queryKey: ["suspension-status", memberId] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useMemberUnpaidFines(memberId: string) {
  return useQuery({
    queryKey: ["member-unpaid-fines", memberId],
    queryFn: () => api.get(`/api/members/${memberId}/unpaid-fines`),
  });
}
