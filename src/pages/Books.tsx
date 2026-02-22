import { useState } from "react";
import { BookOpen, Plus, Search, Pencil, Trash2, Upload, Eye, Filter, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { useBooks, useBookGenres, useDeleteBook, type Book } from "@/hooks/use-books";
import { useAuth } from "@/contexts/AuthContext";
import { BookFormDialog } from "@/components/books/BookFormDialog";
import { DeleteBookDialog } from "@/components/books/DeleteBookDialog";
import { CsvImportDialog } from "@/components/books/CsvImportDialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Books = () => {
  const { role } = useAuth();
  const isStaff = role === "admin" || role === "librarian";
  const navigate = useNavigate();
  const { toast } = useToast();
  const deleteBook = useDeleteBook();

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);

  const { data: books, isLoading } = useBooks(search, genre || undefined);
  const { data: genres } = useBookGenres();

  const [formOpen, setFormOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const handleEdit = (book: Book) => { setEditBook(book); setFormOpen(true); };
  const handleAdd = () => { setEditBook(null); setFormOpen(true); };
  const handleDelete = (book: Book) => { setDeleteTarget({ id: book.id, title: book.title }); setDeleteOpen(true); };

  // Apply client-side filters for availability and year range
  const filteredBooks = books?.filter((book) => {
    if (availabilityFilter === "available" && book.available_copies === 0) return false;
    if (availabilityFilter === "unavailable" && book.available_copies > 0) return false;
    if (book.publication_year) {
      if (book.publication_year < yearRange[0] || book.publication_year > yearRange[1]) return false;
    }
    return true;
  });

  // Bulk operations
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredBooks) return;
    if (selected.size === filteredBooks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredBooks.map((b) => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleteLoading(true);
    try {
      for (const id of selected) {
        await deleteBook.mutateAsync(id);
      }
      toast({ title: `${selected.size} book(s) deleted` });
      setSelected(new Set());
    } catch (e: any) {
      toast({ title: "Bulk delete failed", description: e.message, variant: "destructive" });
    }
    setBulkDeleteLoading(false);
  };

  const allSelected = filteredBooks && filteredBooks.length > 0 && selected.size === filteredBooks.length;

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

      {/* Search + Filter Toggle */}
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
        <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-primary/10 border-primary" : ""}>
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Advanced Filters (collapsible) */}
      <Collapsible open={showFilters}>
        <CollapsibleContent>
          <div className="glass rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Advanced Filters
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Availability */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Availability</label>
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Books</SelectItem>
                    <SelectItem value="available">In Stock</SelectItem>
                    <SelectItem value="unavailable">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Year Range */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Publication Year: {yearRange[0]} – {yearRange[1]}</label>
                <Slider
                  min={1900}
                  max={new Date().getFullYear()}
                  step={1}
                  value={yearRange}
                  onValueChange={(v) => setYearRange(v as [number, number])}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setAvailabilityFilter("all"); setYearRange([1900, new Date().getFullYear()]); }}>
                Reset Filters
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Bulk Action Bar */}
      {isStaff && selected.size > 0 && (
        <div className="glass rounded-lg p-3 flex items-center justify-between gap-3 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selected.size} book(s) selected</span>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteLoading}>
              <Trash2 className="h-4 w-4 mr-1" />{bulkDeleteLoading ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : !filteredBooks?.length ? (
        <div className="glass rounded-lg p-12 flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No books found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-lg overflow-x-auto">
          <Table className="min-w-[650px]">
            <TableHeader>
              <TableRow>
                {isStaff && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                )}
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBooks.map((book) => (
                <TableRow key={book.id} className="cursor-pointer" onClick={() => navigate(`/books/${book.id}`)}>
                  {isStaff && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(book.id)}
                        onCheckedChange={() => toggleSelect(book.id)}
                      />
                    </TableCell>
                  )}
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
