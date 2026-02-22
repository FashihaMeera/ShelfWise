import { useState } from "react";

interface OpenLibraryBook {
    title?: string;
    authors?: { name: string }[];
    subjects?: { name: string }[];
    publishers?: { name: string }[];
    publish_date?: string;
    number_of_pages?: number;
    cover?: { small?: string; medium?: string; large?: string };
    excerpts?: { text: string }[];
    notes?: string;
}

export interface ISBNLookupResult {
    title: string;
    author: string;
    description: string;
    cover_image_url: string;
    publication_year: string;
    genre: string;
}

export function useISBNLookup() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lookup = async (isbn: string): Promise<ISBNLookupResult | null> => {
        const cleanISBN = isbn.replace(/[-\s]/g, "");
        if (!cleanISBN || cleanISBN.length < 10) {
            setError("Please enter a valid ISBN (10 or 13 digits)");
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`
            );
            if (!res.ok) throw new Error("Failed to fetch from Open Library");

            const data = await res.json();
            const key = `ISBN:${cleanISBN}`;
            const book: OpenLibraryBook | undefined = data[key];

            if (!book) {
                setError("No book found for this ISBN. Try a different ISBN.");
                setIsLoading(false);
                return null;
            }

            // Extract year from publish_date (could be "1960", "March 1, 2005", etc.)
            const yearMatch = book.publish_date?.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : "";

            // Get the first subject as genre
            const genre = book.subjects?.[0]?.name || "";

            // Build description from notes or excerpts
            const description =
                (typeof book.notes === "string" ? book.notes : "") ||
                book.excerpts?.[0]?.text ||
                "";

            const result: ISBNLookupResult = {
                title: book.title || "",
                author: book.authors?.map((a) => a.name).join(", ") || "",
                description,
                cover_image_url: book.cover?.large || book.cover?.medium || book.cover?.small || "",
                publication_year: year,
                genre,
            };

            setIsLoading(false);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lookup failed");
            setIsLoading(false);
            return null;
        }
    };

    return { lookup, isLoading, error };
}
