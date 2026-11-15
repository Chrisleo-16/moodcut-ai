"use client";

import { Button } from "@heroui/react";

import { useWatchlist, type SavedTitle } from "@/components/watchlist";

export function SaveButton({ item, tone = "light" }: { item: SavedTitle; tone?: "light" | "dark" }) {
  const { isSaved, toggle } = useWatchlist();
  const saved = isSaved(item.mediaType, item.id);
  return (
    <Button
      variant={tone === "light" ? "outline" : "secondary"}
      className={tone === "light" ? "border-white text-white" : undefined}
      aria-pressed={saved}
      onPress={() => toggle(item)}
    >
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
