import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useUserFines, useCreatePaymentIntent, useRecordCashPayment } from "@/hooks/use-payments";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign } from "lucide-react";

export function FinePaymentDialog() {
  const { data: fines, isLoading } = useUserFines();
  const createPaymentIntent = useCreatePaymentIntent();
  const recordCashPayment = useRecordCashPayment();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const unpaidFines = fines?.filter((f) => !f.paid && !f.waived) || [];
  const totalUnpaid = unpaidFines.reduce((sum, f) => sum + f.amount, 0);

  const handleStripePayment = async (fineId: string) => {
    try {
      const result = await createPaymentIntent.mutateAsync(fineId);
      // In a real app, redirect to Stripe checkout or open payment modal
      toast({
        title: "Payment Intent Created",
        description: "Redirecting to payment page...",
      });
      // window.location.href = result.checkout_url; // if using checkout
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={
            unpaidFines.length > 0
              ? "border-destructive text-destructive hover:bg-destructive/5"
              : ""
          }
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Fines ({unpaidFines.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Outstanding Fines</DialogTitle>
          <DialogDescription>
            You have {unpaidFines.length} unpaid fine{unpaidFines.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        {unpaidFines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No outstanding fines. Great job!
          </div>
        ) : (
          <div className="space-y-4">
            {unpaidFines.map((fine) => (
              <div
                key={fine.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">${fine.amount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(fine.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleStripePayment(fine.id)}
                  disabled={createPaymentIntent.isPending}
                  className="gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay
                </Button>
              </div>
            ))}

            <div className="border-t pt-4">
              <p className="font-semibold flex justify-between items-center">
                <span>Total Due:</span>
                <span className="text-destructive">${totalUnpaid.toFixed(2)}</span>
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
