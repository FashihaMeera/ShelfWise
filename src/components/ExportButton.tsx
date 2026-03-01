import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useExportBorrowingHistory, useExportMembersReport } from "@/hooks/use-export";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Sheet } from "lucide-react";
import { useState } from "react";

interface ExportButtonProps {
  type: "borrowing-history" | "members-report";
  memberId?: string;
}

export function ExportButton({ type, memberId }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const borrowingHistoryExport = useExportBorrowingHistory();
  const membersReportExport = useExportMembersReport();

  const handleExportCSV = async () => {
    setIsLoading(true);
    try {
      if (type === "borrowing-history" && memberId) {
        await borrowingHistoryExport.exportCSV(memberId);
      } else if (type === "members-report") {
        await membersReportExport.exportCSV();
      }
      toast({
        title: "Success",
        description: "Report exported as CSV",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setIsLoading(true);
    try {
      if (type === "borrowing-history" && memberId) {
        await borrowingHistoryExport.exportExcel(memberId);
      } else if (type === "members-report") {
        await membersReportExport.exportExcel();
      }
      toast({
        title: "Success",
        description: "Report exported as Excel",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <Download className="h-4 w-4 mr-2" />
          {isLoading ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} disabled={isLoading}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportExcel} disabled={isLoading}>
          <Sheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
