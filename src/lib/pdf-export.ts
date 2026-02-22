import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface PDFExportOptions {
    title: string;
    subtitle?: string;
    headers: string[];
    rows: string[][];
    filename: string;
}

export function exportToPDF({ title, subtitle, headers, rows, filename }: PDFExportOptions) {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 22);

    // Subtitle / date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const dateStr = `Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`;
    doc.text(subtitle ? `${subtitle} • ${dateStr}` : dateStr, 14, 30);

    // Summary stat
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Total records: ${rows.length}`, 14, 38);

    // Table
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 44,
        styles: {
            fontSize: 9,
            cellPadding: 4,
        },
        headStyles: {
            fillColor: [99, 102, 241], // indigo
            textColor: 255,
            fontStyle: "bold",
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250],
        },
        margin: { top: 44 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `ShelfWise Library Report • Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" }
        );
    }

    doc.save(filename);
}

export function exportOverduePDF(
    data: { book_title: string; member_name: string; due_date: string; days_overdue: number }[]
) {
    exportToPDF({
        title: "Overdue Books Report",
        subtitle: `${data.length} overdue items`,
        headers: ["Book", "Member", "Due Date", "Days Overdue"],
        rows: data.map((r) => [
            r.book_title,
            r.member_name,
            format(new Date(r.due_date), "MMM d, yyyy"),
            String(r.days_overdue),
        ]),
        filename: `overdue-books-${format(new Date(), "yyyy-MM-dd")}.pdf`,
    });
}

export function exportPopularPDF(
    data: { title: string; author: string; count: number }[]
) {
    exportToPDF({
        title: "Most Borrowed Books",
        subtitle: "Top books by borrow count",
        headers: ["Title", "Author", "Times Borrowed"],
        rows: data.map((r) => [r.title, r.author, String(r.count)]),
        filename: `popular-books-${format(new Date(), "yyyy-MM-dd")}.pdf`,
    });
}

export function exportInventoryPDF(
    data: { title: string; author: string; isbn: string; genre: string; total: number; available: number }[]
) {
    exportToPDF({
        title: "Library Inventory",
        subtitle: `${data.length} books in catalog`,
        headers: ["Title", "Author", "ISBN", "Genre", "Total Copies", "Available"],
        rows: data.map((r) => [
            r.title,
            r.author,
            r.isbn || "—",
            r.genre || "—",
            String(r.total),
            String(r.available),
        ]),
        filename: `library-inventory-${format(new Date(), "yyyy-MM-dd")}.pdf`,
    });
}
