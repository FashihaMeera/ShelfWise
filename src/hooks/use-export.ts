import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useExportBorrowingHistory() {
  return {
    exportCSV: async (memberId: string) => {
      const response = await fetch(
        `/api/exports/${memberId}/borrowing-history/csv`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      const blob = await response.blob();
      downloadBlob(blob, `borrowing-history-${memberId}.csv`);
    },
    exportExcel: async (memberId: string) => {
      const response = await fetch(
        `/api/exports/${memberId}/borrowing-history/excel`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      const blob = await response.blob();
      downloadBlob(blob, `borrowing-history-${memberId}.xlsx`);
    },
  };
}

export function useExportMembersReport() {
  return {
    exportCSV: async () => {
      const response = await fetch("/api/exports/members/report/csv", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const blob = await response.blob();
      const date = new Date().toISOString().split("T")[0];
      downloadBlob(blob, `members-report-${date}.csv`);
    },
    exportExcel: async () => {
      const response = await fetch("/api/exports/members/report/excel", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const blob = await response.blob();
      const date = new Date().toISOString().split("T")[0];
      downloadBlob(blob, `members-report-${date}.xlsx`);
    },
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
