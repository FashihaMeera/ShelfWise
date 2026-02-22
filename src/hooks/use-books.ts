import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      let query = supabase.from("books").select("*").order("title");
      if (search) {
        query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%`);
      }
      if (genre) {
        query = query.eq("genre", genre);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Book[];
    },
  });
}

export function useBookGenres() {
  return useQuery({
    queryKey: ["book-genres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("genre")
        .not("genre", "is", null)
        .order("genre");
      if (error) throw error;
      const genres = [...new Set(data.map((b) => b.genre as string))];
      return genres;
    },
  });
}

export function useAddBook() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (book: BookInsert) => {
      const { data, error } = await supabase.from("books").insert({
        ...book,
        available_copies: book.available_copies ?? book.total_copies,
      }).select().single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from("books").update(book).eq("id", id);
      if (error) throw error;
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
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["book-genres"] });
      toast({ title: "Book deleted successfully" });
    },
    onError: (e) => toast({ title: "Failed to delete book", description: e.message, variant: "destructive" }),
  });
}
