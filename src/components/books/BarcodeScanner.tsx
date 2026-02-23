import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Keyboard, AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (result: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScan }: Props) {
    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualInput, setManualInput] = useState("");
    const [crashed, setCrashed] = useState(false);
    const scannerRef = useRef<any>(null);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setError(null);
            setCrashed(false);
            if (!manualMode) {
                // Delay to let the dialog DOM render fully
                const timer = setTimeout(() => startScanner(), 800);
                return () => clearTimeout(timer);
            }
        } else {
            stopScanner();
            setManualInput("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const startScanner = async () => {
        setError(null);
        setScanning(false);

        try {
            // Check if the container exists
            const el = document.getElementById("barcode-reader");
            if (!el) {
                setError("Scanner container not ready. Please try again.");
                return;
            }

            // Clear previous content
            el.innerHTML = "";

            // Dynamically import the library
            let Html5Qrcode: any;
            try {
                const mod = await import("html5-qrcode");
                Html5Qrcode = mod.Html5Qrcode;
            } catch (importErr) {
                setError("Failed to load scanner library. Try manual entry.");
                setManualMode(true);
                return;
            }

            // Create scanner instance
            const scanner = new Html5Qrcode("barcode-reader");
            scannerRef.current = scanner;
            setScanning(true);

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText: string) => {
                    stopScanner();
                    onScan(decodedText);
                    onOpenChange(false);
                },
                () => { } // scan failure (ignored)
            );
        } catch (err: any) {
            setScanning(false);
            const msg = err?.message || String(err);
            console.error("BarcodeScanner error:", msg);

            if (msg.includes("NotAllowed") || msg.includes("Permission")) {
                setError("Camera permission denied. Please allow camera access in browser settings, then retry.");
            } else if (msg.includes("NotFound") || msg.includes("device not found")) {
                setError("No camera found on this device. Use manual entry below.");
                setManualMode(true);
            } else if (msg.includes("NotReadable") || msg.includes("Could not start")) {
                setError("Camera is busy (another app may be using it). Close other apps and retry.");
            } else {
                setError(`Could not start camera: ${msg}`);
            }
        }
    };

    const stopScanner = () => {
        const s = scannerRef.current;
        scannerRef.current = null;
        setScanning(false);
        if (s) {
            try { s.stop().catch(() => { }); } catch { }
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const val = manualInput.trim();
        if (val) {
            onScan(val);
            onOpenChange(false);
        }
    };

    const handleRetry = () => {
        stopScanner();
        setError(null);
        setCrashed(false);
        setManualMode(false);
        setTimeout(() => startScanner(), 500);
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
                    {!manualMode ? (
                        <>
                            <div
                                id="barcode-reader"
                                className="w-full min-h-[280px] rounded-lg overflow-hidden bg-muted flex items-center justify-center text-sm text-muted-foreground"
                            >
                                {!scanning && !error && "Starting camera..."}
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground text-center">
                                Point your camera at a book barcode or member QR code
                            </p>

                            <div className="flex gap-2">
                                {error && (
                                    <Button variant="outline" className="flex-1" onClick={handleRetry}>
                                        <RefreshCw className="h-4 w-4 mr-2" /> Retry
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => { stopScanner(); setManualMode(true); setError(null); }}
                                >
                                    <Keyboard className="h-4 w-4 mr-2" /> Enter manually
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Type the ISBN number or scan data:
                            </p>
                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <Input
                                    placeholder="e.g. 978-0451524935"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    autoFocus
                                />
                                <Button type="submit" disabled={!manualInput.trim()}>Search</Button>
                            </form>
                            <Button variant="outline" className="w-full" onClick={handleRetry}>
                                <Camera className="h-4 w-4 mr-2" /> Try camera again
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
