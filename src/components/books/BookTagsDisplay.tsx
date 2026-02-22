import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Tag } from "lucide-react";
import { useBookTags, useAllTags, useAddBookTag, useRemoveBookTag } from "@/hooks/use-book-tags";

interface Props {
    bookId: string;
    editable?: boolean;
}

export function BookTagsDisplay({ bookId, editable = false }: Props) {
    const { data: tags, isLoading } = useBookTags(bookId);
    const { data: allTags } = useAllTags();
    const addTag = useAddBookTag();
    const removeTag = useRemoveBookTag();
    const [newTag, setNewTag] = useState("");
    const [showInput, setShowInput] = useState(false);

    // Filter out already-added tags for suggestions
    const existingTagNames = tags?.map((t) => t.tag) || [];
    const suggestions = (allTags || []).filter(
        (t) => !existingTagNames.includes(t) && t.includes(newTag.toLowerCase())
    );

    const handleAdd = async () => {
        const tagValue = newTag.trim().toLowerCase();
        if (!tagValue) return;
        await addTag.mutateAsync({ bookId, tag: tagValue });
        setNewTag("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
        }
    };

    if (isLoading) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                {tags?.length === 0 && !editable && (
                    <span className="text-xs text-muted-foreground">No tags</span>
                )}
                {tags?.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="gap-1 text-xs">
                        {tag.tag}
                        {editable && (
                            <button
                                type="button"
                                onClick={() => removeTag.mutate({ bookId, tagId: tag.id })}
                                className="ml-0.5 hover:text-destructive transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </Badge>
                ))}
                {editable && !showInput && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => setShowInput(true)}
                    >
                        <Plus className="h-3 w-3" /> Add Tag
                    </Button>
                )}
            </div>

            {editable && showInput && (
                <div className="flex gap-2 items-start">
                    <div className="relative flex-1">
                        <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a tag..."
                            className="h-8 text-sm"
                            autoFocus
                        />
                        {newTag && suggestions.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-32 overflow-y-auto">
                                {suggestions.slice(0, 5).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                                        onClick={() => {
                                            addTag.mutate({ bookId, tag: s });
                                            setNewTag("");
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <Button type="button" size="sm" className="h-8" onClick={handleAdd} disabled={!newTag.trim()}>
                        Add
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setShowInput(false); setNewTag(""); }}>
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
