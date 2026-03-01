import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useSuspendMember,
  useUnsuspendMember,
  useMemberSuspensionStatus,
} from "@/hooks/use-member-suspension";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface MemberSuspensionModalProps {
  memberId: string;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberSuspensionModal({
  memberId,
  memberName,
  open,
  onOpenChange,
}: MemberSuspensionModalProps) {
  const [reason, setReason] = useState("");
  const { data: suspensionStatus } = useMemberSuspensionStatus(memberId);
  const suspendMember = useSuspendMember();
  const unsuspendMember = useUnsuspendMember();
  const { toast } = useToast();

  const isSuspended = suspensionStatus?.is_suspended || false;

  const handleSuspend = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a suspension reason",
        variant: "destructive",
      });
      return;
    }

    try {
      await suspendMember.mutateAsync({
        memberId,
        reason,
      });
      toast({
        title: "Success",
        description: `${memberName} has been suspended`,
      });
      onOpenChange(false);
      setReason("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnsuspend = async () => {
    try {
      await unsuspendMember.mutateAsync(memberId);
      toast({
        title: "Success",
        description: `${memberName} has been unsuspended`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSuspended ? "Unsuspend Member" : "Suspend Member"}
          </DialogTitle>
          <DialogDescription>
            {memberName}
            {isSuspended && ` - Suspension Reason: ${suspensionStatus?.suspension_reason}`}
          </DialogDescription>
        </DialogHeader>

        {isSuspended && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This member is currently suspended and cannot borrow books.
            </AlertDescription>
          </Alert>
        )}

        {!isSuspended && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Suspension Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for suspending this member (e.g., 'Multiple unpaid fines', 'Damaged book returned')"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isSuspended ? (
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={suspendMember.isPending}
            >
              {suspendMember.isPending ? "Suspending..." : "Suspend"}
            </Button>
          ) : (
            <Button
              onClick={handleUnsuspend}
              disabled={unsuspendMember.isPending}
            >
              {unsuspendMember.isPending ? "Unsuspending..." : "Unsuspend"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
