import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload } from "lucide-react";
import { parseCsv, useBulkImportBooks, type CsvBookRow } from "@/hooks/use-csv-import";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const [rows, setRows] = useState<CsvBookRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const importBooks = useBulkImportBooks();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
    };
    reader.readAsText(file);
  };

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => r.error).length;

  const handleImport = () => {
    importBooks.mutate(rows, {
      onSuccess: () => { setRows([]); onOpenChange(false); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Books from CSV</DialogTitle>
        </DialogHeader>

        {!rows.length ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with columns: title, author, isbn, genre, publication_year, total_copies, description
            </p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />Select CSV File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <Badge variant="default">{validCount} valid</Badge>
              {errorCount > 0 && <Badge variant="destructive">{errorCount} errors</Badge>}
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Copies</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((r, i) => (
                    <TableRow key={i} className={r.error ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{r.title || "—"}</TableCell>
                      <TableCell>{r.author || "—"}</TableCell>
                      <TableCell>{r.genre || "—"}</TableCell>
                      <TableCell>{r.publication_year || "—"}</TableCell>
                      <TableCell>{r.total_copies || 1}</TableCell>
                      <TableCell>
                        {r.error ? (
                          <Badge variant="destructive">{r.error}</Badge>
                        ) : (
                          <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setRows([]); }}>Clear</Button>
              <Button onClick={handleImport} disabled={!validCount || importBooks.isPending}>
                {importBooks.isPending ? "Importing..." : `Import ${validCount} Books`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
