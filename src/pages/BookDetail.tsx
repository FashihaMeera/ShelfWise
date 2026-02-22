import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Heart, CalendarClock } from "lucide-react";
import { BookTagsDisplay } from "@/components/books/BookTagsDisplay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsInReadingList, useToggleReadingList } from "@/hooks/use-reading-list";
import { useAverageRating } from "@/hooks/use-reviews";
import { useCreateReservation } from "@/hooks/use-reservations";
import { StarRating } from "@/components/books/StarRating";
import { ReviewSection } from "@/components/books/ReviewSection";
import { QRCodeView } from "@/components/books/QRCodeView";
import { format } from "date-fns";
import type { Book } from "@/hooks/use-books";

function useBookDetail(id: string) {
  return useQuery({
    queryKey: ["book-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Book;
    },
    enabled: !!id,
  });
}

function useBookBorrowingHistory(bookId: string) {
  return useQuery({
    queryKey: ["book-borrowing-history", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("borrowings")
        .select("*, profiles!borrowings_user_id_fkey(full_name)")
        .eq("book_id", bookId)
        .order("borrowed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data.map((b: any) => ({ ...b, member_name: b.profiles?.full_name || "Unknown" }));
    },
    enabled: !!bookId,
  });
}

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isStaff = role === "admin" || role === "librarian";

  const { data: book, isLoading } = useBookDetail(id!);
  const { data: history } = useBookBorrowingHistory(id!);
  const { average, count } = useAverageRating(id!);
  const isInList = useIsInReadingList(id!);
  const toggleList = useToggleReadingList();
  const createReservation = useCreateReservation();

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;
  if (!book) return <div className="p-12 text-center text-muted-foreground">Book not found.</div>;

  return (
    <div className="space-y-6 animate-in-up">
      <Button variant="ghost" size="sm" onClick={() => navigate("/books")}>
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Books
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cover + QR */}
        <div className="space-y-4">
          {book.cover_image_url ? (
            <img src={book.cover_image_url} alt={book.title} className="w-full max-w-[300px] rounded-lg shadow-lg mx-auto" />
          ) : (
            <div className="w-full max-w-[300px] h-[400px] bg-muted rounded-lg flex items-center justify-center mx-auto">
              <BookOpen className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          <QRCodeView bookId={book.id} bookTitle={book.title} />
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{book.title}</h1>
            <p className="text-lg text-muted-foreground mt-1">by {book.author}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {book.genre && <Badge variant="secondary">{book.genre}</Badge>}
              {book.publication_year && <Badge variant="outline">{book.publication_year}</Badge>}
              {book.isbn && <Badge variant="outline">ISBN: {book.isbn}</Badge>}
              <Badge variant={book.available_copies > 0 ? "default" : "destructive"} className={book.available_copies > 0 ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : ""}>
                {book.available_copies}/{book.total_copies} available
              </Badge>
            </div>
            <div className="mt-3">
              <BookTagsDisplay bookId={book.id} editable={isStaff} />
            </div>
            {count > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <StarRating rating={Math.round(average)} size="sm" />
                <span className="text-sm text-muted-foreground">{average} ({count} reviews)</span>
              </div>
            )}
          </div>

          {book.description && (
            <div>
              <h3 className="font-semibold mb-1">Description</h3>
              <p className="text-sm text-muted-foreground">{book.description}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={isInList ? "default" : "outline"}
              size="sm"
              onClick={() => toggleList.mutate({ bookId: book.id, isInList })}
              disabled={toggleList.isPending}
            >
              <Heart className={`h-4 w-4 mr-2 ${isInList ? "fill-current" : ""}`} />
              {isInList ? "In Reading List" : "Add to Reading List"}
            </Button>
            {book.available_copies === 0 && user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => createReservation.mutate({ book_id: book.id, user_id: user.id })}
                disabled={createReservation.isPending}
              >
                <CalendarClock className="h-4 w-4 mr-2" />Reserve
              </Button>
            )}
          </div>

          <Tabs defaultValue="reviews">
            <TabsList>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              {isStaff && <TabsTrigger value="history">Borrowing History</TabsTrigger>}
            </TabsList>
            <TabsContent value="reviews" className="mt-4">
              <ReviewSection bookId={book.id} />
            </TabsContent>
            {isStaff && (
              <TabsContent value="history" className="mt-4">
                {!history?.length ? (
                  <p className="text-muted-foreground text-sm">No borrowing history.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Borrowed</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Returned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((b: any) => (
                          <TableRow key={b.id}>
                            <TableCell>{b.member_name}</TableCell>
                            <TableCell>{format(new Date(b.borrowed_at), "MMM d, yyyy")}</TableCell>
                            <TableCell>{format(new Date(b.due_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{b.returned_at ? format(new Date(b.returned_at), "MMM d, yyyy") : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
