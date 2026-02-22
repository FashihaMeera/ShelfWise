import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddBook, useUpdateBook, type Book } from "@/hooks/use-books";

const GENRES = ["Fiction", "Science", "History", "Technology", "Science Fiction", "Fantasy", "Psychology", "Business"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book | null;
}

export function BookFormDialog({ open, onOpenChange, book }: Props) {
  const addBook = useAddBook();
  const updateBook = useUpdateBook();
  const isEdit = !!book;

  const [form, setForm] = useState({
    title: "", author: "", isbn: "", genre: "", description: "",
    cover_image_url: "", publication_year: "", total_copies: "1",
  });

  useEffect(() => {
    if (book) {
      setForm({
        title: book.title, author: book.author, isbn: book.isbn || "",
        genre: book.genre || "", description: book.description || "",
        cover_image_url: book.cover_image_url || "",
        publication_year: book.publication_year?.toString() || "",
        total_copies: book.total_copies.toString(),
      });
    } else {
      setForm({ title: "", author: "", isbn: "", genre: "", description: "", cover_image_url: "", publication_year: "", total_copies: "1" });
    }
  }, [book, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      author: form.author,
      isbn: form.isbn || null,
      genre: form.genre || null,
      description: form.description || null,
      cover_image_url: form.cover_image_url || null,
      publication_year: form.publication_year ? parseInt(form.publication_year) : null,
      total_copies: parseInt(form.total_copies) || 1,
    };

    if (isEdit && book) {
      await updateBook.mutateAsync({ id: book.id, ...payload });
    } else {
      await addBook.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Book" : "Add New Book"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={set("title")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author *</Label>
              <Input id="author" value={form.author} onChange={set("author")} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input id="isbn" value={form.isbn} onChange={set("isbn")} />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={form.genre} onValueChange={(v) => setForm((p) => ({ ...p, genre: v }))}>
                <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Publication Year</Label>
              <Input id="year" type="number" value={form.publication_year} onChange={set("publication_year")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copies">Total Copies</Label>
              <Input id="copies" type="number" min="1" value={form.total_copies} onChange={set("total_copies")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={form.description} onChange={set("description")} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover">Cover Image URL</Label>
            <Input id="cover" value={form.cover_image_url} onChange={set("cover_image_url")} placeholder="https://..." />
            {form.cover_image_url && (
              <img src={form.cover_image_url} alt="Preview" className="h-20 w-14 object-cover rounded border border-border mt-1" />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={addBook.isPending || updateBook.isPending}>
              {isEdit ? "Save Changes" : "Add Book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
