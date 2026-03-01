import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  description: string | null;
  cover_image_url: string | null;
  publication_year: number | null;
  total_copies: number;
  available_copies: number;
  created_at: string;
  updated_at: string;
}

export type BookInsert = Omit<Book, "id" | "created_at" | "updated_at" | "available_copies"> & {
  available_copies?: number;
};

export function useBooks(search?: string, genre?: string) {
  return useQuery({
    queryKey: ["books", search, genre],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (genre) params.set("genre", genre);
      const qs = params.toString();
      return api.get<Book[]>(`/api/books${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useBookGenres() {
  return useQuery({
    queryKey: ["book-genres"],
    queryFn: () => api.get<string[]>("/api/books/genres"),
  });
}

export function useAddBook() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (book: BookInsert) => {
      return api.post<Book>("/api/books", {
        ...book,
        available_copies: book.available_copies ?? book.total_copies,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["book-genres"] });
      toast({ title: "Book added successfully" });
    },
    onError: (e) => toast({ title: "Failed to add book", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...book }: Partial<Book> & { id: string }) => {
      await api.put(`/api/books/${id}`, book);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["book-genres"] });
      toast({ title: "Book updated successfully" });
    },
    onError: (e) => toast({ title: "Failed to update book", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/books/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["book-genres"] });
      toast({ title: "Book deleted successfully" });
    },
    onError: (e) => toast({ title: "Failed to delete book", description: e.message, variant: "destructive" }),
  });
}
