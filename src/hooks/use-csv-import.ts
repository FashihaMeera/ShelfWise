import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export interface CsvBookRow {
  title: string;
  author: string;
  isbn?: string;
  genre?: string;
  publication_year?: number;
  total_copies?: number;
  description?: string;
  error?: string;
}

export function parseCsv(text: string): CsvBookRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: any = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });

    const parsed: CsvBookRow = {
      title: row.title || "",
      author: row.author || "",
      isbn: row.isbn || undefined,
      genre: row.genre || undefined,
      publication_year: row.publication_year ? parseInt(row.publication_year) : undefined,
      total_copies: row.total_copies ? parseInt(row.total_copies) : 1,
      description: row.description || undefined,
    };

    if (!parsed.title) parsed.error = "Missing title";
    else if (!parsed.author) parsed.error = "Missing author";

    return parsed;
  });
}

export function useBulkImportBooks() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rows: CsvBookRow[]) => {
      const valid = rows.filter((r) => !r.error);
      if (!valid.length) throw new Error("No valid rows to import");

      const books = valid.map((r) => ({
        title: r.title,
        author: r.author,
        isbn: r.isbn || null,
        genre: r.genre || null,
        publication_year: r.publication_year || null,
        total_copies: r.total_copies || 1,
        available_copies: r.total_copies || 1,
        description: r.description || null,
      }));

      const result = await api.post<{ count: number }>("/api/books/bulk", books);
      return result.count ?? valid.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["book-genres"] });
      toast({ title: `${count} books imported successfully` });
    },
    onError: (e) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });
}
