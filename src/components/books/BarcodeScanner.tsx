import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (result: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScan }: Props) {
    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            stopScanner();
            return;
        }

        // Delay start to allow the dialog to render
        const timer = setTimeout(() => startScanner(), 300);
        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, [open]);

    const startScanner = async () => {
        setError(null);
        setScanning(true);

        try {
            const { Html5Qrcode } = await import("html5-qrcode");
            const scanner = new Html5Qrcode("barcode-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.5,
                },
                (decodedText: string) => {
                    onScan(decodedText);
                    stopScanner();
                    onOpenChange(false);
                },
                () => {
                    // QR scan failure (ignored, scanning continues)
                }
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message.includes("NotAllowed")
                        ? "Camera access denied. Please allow camera permissions."
                        : err.message
                    : "Failed to start camera"
            );
            setScanning(false);
        }
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            try {
                scannerRef.current.stop().catch(() => { });
            } catch { }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) stopScanner(); onOpenChange(v); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" /> Scan Barcode / QR Code
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div
                        id="barcode-reader"
                        ref={containerRef}
                        className="w-full min-h-[250px] rounded-lg overflow-hidden bg-muted"
                    />
                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                            {error}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                        Point your camera at a book barcode or member QR code
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
