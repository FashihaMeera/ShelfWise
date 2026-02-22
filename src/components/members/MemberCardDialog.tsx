import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberId: string;
    memberName: string;
    memberRole: string;
    memberAvatar?: string | null;
}

export function MemberCardDialog({ open, onOpenChange, memberId, memberName, memberRole, memberAvatar }: Props) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!cardRef.current) return;
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        printWindow.document.write(`
      <html>
        <head>
          <title>Library Card - ${memberName}</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; font-family: system-ui, sans-serif; background: #fff; }
            .card { width: 350px; border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px; text-align: center; }
            .logo { font-size: 18px; font-weight: 700; color: #6366f1; margin-bottom: 4px; }
            .subtitle { font-size: 11px; color: #9ca3af; margin-bottom: 16px; }
            .name { font-size: 20px; font-weight: 600; margin: 12px 0 4px; }
            .role { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 500; text-transform: capitalize; background: #f3f4f6; color: #6b7280; }
            .id { font-size: 10px; color: #9ca3af; margin-top: 12px; word-break: break-all; }
            svg { margin: 0 auto; }
            @media print { body { background: #fff; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">📚 ShelfWise</div>
            <div class="subtitle">Library Member Card</div>
            ${cardRef.current.querySelector("svg")?.outerHTML || ""}
            <div class="name">${memberName}</div>
            <div class="role">${memberRole}</div>
            <div class="id">ID: ${memberId}</div>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Library Card</DialogTitle>
                </DialogHeader>
                <div ref={cardRef} className="flex flex-col items-center gap-4 py-4">
                    <div className="text-center">
                        <p className="text-sm font-bold text-primary">📚 ShelfWise</p>
                        <p className="text-[10px] text-muted-foreground">Library Member Card</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                        <QRCodeSVG
                            value={JSON.stringify({ type: "member", id: memberId })}
                            size={160}
                            level="M"
                            includeMargin={false}
                        />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-lg">{memberName}</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground capitalize">
                            {memberRole}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-2 break-all">ID: {memberId}</p>
                    </div>
                </div>
                <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" /> Print Card
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
