import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { exportOverduePDF, exportPopularPDF } from "@/lib/pdf-export";

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ExportButtonsProps {
  overdueData?: { book_title: string; member_name: string; due_date: string; days_overdue: number }[];
  popularData?: { title: string; author: string; count: number }[];
}

export function ExportButtons({ overdueData, popularData }: ExportButtonsProps) {
  const exportOverdueCsv = () => {
    if (!overdueData) return;
    downloadCsv(
      "overdue-books.csv",
      ["Book", "Member", "Due Date", "Days Overdue"],
      overdueData.map((r) => [r.book_title, r.member_name, r.due_date, String(r.days_overdue)])
    );
  };

  const exportPopularCsv = () => {
    if (!popularData) return;
    downloadCsv(
      "popular-books.csv",
      ["Title", "Author", "Times Borrowed"],
      popularData.map((r) => [r.title, r.author, String(r.count)])
    );
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {overdueData && overdueData.length > 0 && (
        <>
          <Button variant="outline" size="sm" onClick={exportOverdueCsv}>
            <Download className="h-4 w-4 mr-2" />Overdue CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportOverduePDF(overdueData)}>
            <FileText className="h-4 w-4 mr-2" />Overdue PDF
          </Button>
        </>
      )}
      {popularData && popularData.length > 0 && (
        <>
          <Button variant="outline" size="sm" onClick={exportPopularCsv}>
            <Download className="h-4 w-4 mr-2" />Popular CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportPopularPDF(popularData)}>
            <FileText className="h-4 w-4 mr-2" />Popular PDF
          </Button>
        </>
      )}
    </div>
  );
}
