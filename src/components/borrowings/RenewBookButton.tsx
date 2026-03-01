import { Button } from "@/components/ui/button";
import { useBookRenewals } from "@/hooks/use-book-renewals";
import { useToast } from "@/hooks/use-toast";
import { RotateCw } from "lucide-react";

interface RenewBookButtonProps {
  borrowingId: string;
  disabled?: boolean;
  showIcon?: boolean;
}

export function RenewBookButton({
  borrowingId,
  disabled = false,
  showIcon = true,
}: RenewBookButtonProps) {
  const { renewBook } = useBookRenewals();
  const { toast } = useToast();

  const handleRenew = async () => {
    try {
      const result = await renewBook.mutateAsync(borrowingId);
      toast({
        title: "Success",
        description: result.message || "Book renewed successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to renew book";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRenew}
      disabled={disabled || renewBook.isPending}
      className="gap-2"
    >
      {showIcon && <RotateCw className="h-4 w-4" />}
      {renewBook.isPending ? "Renewing..." : "Renew"}
    </Button>
  );
}
