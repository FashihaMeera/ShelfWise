import { useState } from "react";
import { Trophy, Plus, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useReadingChallenges, useCreateChallenge, useDeleteChallenge, useBooksReadInRange, type ReadingChallenge } from "@/hooks/use-reading-challenges";
import { format, differenceInDays, isPast } from "date-fns";

function ChallengeCard({ challenge }: { challenge: ReadingChallenge }) {
    const { data: booksRead } = useBooksReadInRange(challenge.start_date, challenge.end_date);
    const deleteChallenge = useDeleteChallenge();
    const progress = Math.min(((booksRead || 0) / challenge.target_books) * 100, 100);
    const isComplete = (booksRead || 0) >= challenge.target_books;
    const isExpired = isPast(new Date(challenge.end_date)) && !isComplete;
    const daysLeft = Math.max(0, differenceInDays(new Date(challenge.end_date), new Date()));

    return (
        <div className={`glass rounded-lg p-5 space-y-3 border ${isComplete ? "border-[hsl(var(--success))]/50" : isExpired ? "border-destructive/30" : "border-border"}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    {isComplete ? (
                        <span className="text-xl">🏆</span>
                    ) : (
                        <Target className="h-5 w-5 text-primary" />
                    )}
                    <h3 className="font-semibold">{challenge.title}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteChallenge.mutate(challenge.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                        {booksRead || 0} / {challenge.target_books} books
                    </span>
                    <span className={`font-medium ${isComplete ? "text-[hsl(var(--success))]" : isExpired ? "text-destructive" : "text-primary"}`}>
                        {isComplete ? "Complete! 🎉" : isExpired ? "Expired" : `${daysLeft} days left`}
                    </span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{format(new Date(challenge.start_date), "MMM d")} – {format(new Date(challenge.end_date), "MMM d, yyyy")}</span>
                <span>{Math.round(progress)}%</span>
            </div>
        </div>
    );
}

export default function ReadingChallenges() {
    const { user } = useAuth();
    const { data: challenges, isLoading } = useReadingChallenges();
    const createChallenge = useCreateChallenge();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        title: "",
        target_books: "5",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        await createChallenge.mutateAsync({
            user_id: user.id,
            title: form.title,
            target_books: parseInt(form.target_books) || 5,
            start_date: form.start_date,
            end_date: form.end_date,
        });
        setDialogOpen(false);
        setForm({ title: "", target_books: "5", start_date: format(new Date(), "yyyy-MM-dd"), end_date: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd") });
    };

    const activeChallenges = challenges?.filter((c) => !isPast(new Date(c.end_date)) || (c as any)._complete) || [];
    const pastChallenges = challenges?.filter((c) => isPast(new Date(c.end_date))) || [];

    return (
        <div className="space-y-6 animate-in-up">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reading Challenges</h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">Set goals and track your reading journey.</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />New Challenge
                </Button>
            </div>

            {isLoading ? (
                <div className="glass rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
            ) : !challenges?.length ? (
                <div className="glass rounded-lg p-12 flex items-center justify-center min-h-[300px]">
                    <div className="text-center text-muted-foreground">
                        <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No challenges yet</p>
                        <p className="text-sm">Create your first reading challenge to get started!</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {activeChallenges.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold">Active Challenges</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
                            </div>
                        </div>
                    )}
                    {pastChallenges.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-muted-foreground">Past Challenges</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pastChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Reading Challenge</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Challenge Name</Label>
                            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. March Reading Sprint" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Target Books</Label>
                            <Input type="number" min="1" value={form.target_books} onChange={(e) => setForm((p) => ({ ...p, target_books: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createChallenge.isPending}>Create Challenge</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
