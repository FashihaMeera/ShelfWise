import { useState } from "react";
import { BookOpen, Plus, Search, Pencil, Trash2, Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBooks, useBookGenres, type Book } from "@/hooks/use-books";
import { useAuth } from "@/contexts/AuthContext";
import { BookFormDialog } from "@/components/books/BookFormDialog";
import { DeleteBookDialog } from "@/components/books/DeleteBookDialog";
import { CsvImportDialog } from "@/components/books/CsvImportDialog";
import { useNavigate } from "react-router-dom";

const Books = () => {
  const { role } = useAuth();
  const isStaff = role === "admin" || role === "librarian";
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const { data: books, isLoading } = useBooks(search, genre || undefined);
  const { data: genres } = useBookGenres();

  const [formOpen, setFormOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const handleEdit = (book: Book) => { setEditBook(book); setFormOpen(true); };
  const handleAdd = () => { setEditBook(null); setFormOpen(true); };
  const handleDelete = (book: Book) => { setDeleteTarget({ id: book.id, title: book.title }); setDeleteOpen(true); };

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Books</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your library catalog.</p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCsvOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />Import CSV
            </Button>
            <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />Add Book</Button>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title, author, or ISBN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={genre} onValueChange={(v) => setGenre(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Genres" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {genres?.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : !books?.length ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No books found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-lg overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id} className="cursor-pointer" onClick={() => navigate(`/books/${book.id}`)}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    {book.genre && <Badge variant="secondary">{book.genre}</Badge>}
                  </TableCell>
                  <TableCell>{book.publication_year || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={book.available_copies > 0 ? "default" : "destructive"} className={book.available_copies > 0 ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}>
                      {book.available_copies}/{book.total_copies}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/books/${book.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isStaff && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(book)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(book)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BookFormDialog open={formOpen} onOpenChange={setFormOpen} book={editBook} />
      <DeleteBookDialog open={deleteOpen} onOpenChange={setDeleteOpen} bookId={deleteTarget?.id ?? null} bookTitle={deleteTarget?.title ?? ""} />
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </div>
  );
};

export default Books;
