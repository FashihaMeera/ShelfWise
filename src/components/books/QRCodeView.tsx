import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface QRCodeViewProps {
  bookId: string;
  bookTitle: string;
}

export function QRCodeView({ bookId, bookTitle }: QRCodeViewProps) {
  const url = `${window.location.origin}/books/${bookId}`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>QR - ${bookTitle}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;}</style>
      </head><body>
        <h2>${bookTitle}</h2>
        <div id="qr"></div>
        <p style="font-size:12px;color:#666;margin-top:8px;">${url}</p>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
        <script>
          QRCode.toCanvas(document.createElement('canvas'), '${url}', {width:200}, function(err, canvas) {
            document.getElementById('qr').appendChild(canvas);
            setTimeout(function(){window.print();window.close();}, 500);
          });
        <\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeSVG value={url} size={160} />
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" />Print QR
      </Button>
    </div>
  );
}
