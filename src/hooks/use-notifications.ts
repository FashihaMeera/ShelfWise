import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, createNotificationSocket } from "@/lib/api-client";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export function useNotifications() {
  const qc = useQueryClient();

  // Subscribe to WebSocket notifications
  useEffect(() => {
    const ws = createNotificationSocket(() => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => { ws?.close(); };
  }, [qc]);

  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/api/notifications"),
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter((n) => !n.read).length ?? 0;
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/api/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.put("/api/notifications/read-all");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useClearNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete("/api/notifications/clear-read");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
