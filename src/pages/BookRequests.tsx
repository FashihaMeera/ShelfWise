import { useState } from "react";
import { Gift, Plus, BookPlus, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useBookRequests, useCreateBookRequest, useUpdateBookRequestStatus, type BookRequest } from "@/hooks/use-book-requests";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    approved: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    rejected: "bg-red-500/10 text-red-600 border-red-500/30",
    fulfilled: "bg-green-500/10 text-green-600 border-green-500/30",
};

export default function BookRequests() {
    const { user, role } = useAuth();
    const isStaff = role === "admin" || role === "librarian";
    const { data: requests, isLoading } = useBookRequests();
    const createRequest = useCreateBookRequest();
    const updateStatus = useUpdateBookRequestStatus();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({ title: "", author: "", reason: "", type: "request" });

    const donations = requests?.filter((r) => r.type === "donation") || [];
    const bookRequests = requests?.filter((r) => r.type === "request") || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        await createRequest.mutateAsync({
            user_id: user.id,
            title: form.title,
            author: form.author || undefined,
            reason: form.reason || undefined,
            type: form.type,
        });
        setDialogOpen(false);
        setForm({ title: "", author: "", reason: "", type: "request" });
    };

    const renderTable = (items: BookRequest[]) => (
        <div className="glass rounded-lg overflow-x-auto">
            <Table className="min-w-[500px]">
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        {isStaff && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((r) => (
                        <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.title}</TableCell>
                            <TableCell>{r.author || "—"}</TableCell>
                            <TableCell>{r.profiles?.full_name || "Unknown"}</TableCell>
                            <TableCell>{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`capitalize ${statusColor[r.status] || ""}`}>
                                    {r.status}
                                </Badge>
                            </TableCell>
                            {isStaff && (
                                <TableCell className="text-right">
                                    {r.status === "pending" && (
                                        <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}>
                                                <Check className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}>
                                                <XIcon className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    )}
                                    {r.status === "approved" && (
                                        <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: "fulfilled" })}>
                                            Mark Fulfilled
                                        </Button>
                                    )}
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6 animate-in-up">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Book Requests & Donations</h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">Request new books or offer donations.</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />New Submission
                </Button>
            </div>

            <Tabs defaultValue="requests">
                <TabsList>
                    <TabsTrigger value="requests"><BookPlus className="h-4 w-4 mr-2" />Requests ({bookRequests.length})</TabsTrigger>
                    <TabsTrigger value="donations"><Gift className="h-4 w-4 mr-2" />Donations ({donations.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="requests" className="mt-4">
                    {isLoading ? (
                        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
                    ) : !bookRequests.length ? (
                        <div className="glass rounded-lg p-12 text-center text-muted-foreground">
                            <BookPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>No book requests yet.</p>
                        </div>
                    ) : renderTable(bookRequests)}
                </TabsContent>
                <TabsContent value="donations" className="mt-4">
                    {isLoading ? (
                        <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
                    ) : !donations.length ? (
                        <div className="glass rounded-lg p-12 text-center text-muted-foreground">
                            <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>No donation offers yet.</p>
                        </div>
                    ) : renderTable(donations)}
                </TabsContent>
            </Tabs>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Submission</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="request">📚 Request a Book</SelectItem>
                                    <SelectItem value="donation">🎁 Offer a Donation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Book Title *</Label>
                            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="e.g. The Great Gatsby" />
                        </div>
                        <div className="space-y-2">
                            <Label>Author</Label>
                            <Input value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} placeholder="e.g. F. Scott Fitzgerald" />
                        </div>
                        <div className="space-y-2">
                            <Label>Reason / Notes</Label>
                            <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={2} placeholder="Why do you want this?" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createRequest.isPending}>Submit</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
