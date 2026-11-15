"use client";

import Link from "next/link";

import { Still } from "@/components/still";
import { useRecent } from "@/components/recent";
import { hrefFor } from "@/lib/media";
import { useWatchlist } from "@/components/watchlist";

export function SavedList({ mode = "saved" }: { mode?: "saved" | "recent" }) {
  const saved = useWatchlist();
  const recent = useRecent();
  const items = mode === "recent" ? recent.items : saved.items;
  const ready = mode === "recent" ? true : saved.ready;
  if (!ready) return <p className="mt-8 text-sm">Loading saved titles…</p>;
  if (items.length === 0) {
    return (
      <p className="mt-8 max-w-md text-lg">
        Nothing saved yet. Open a film or series and choose Save.
      </p>
    );
  }
  return (
    <div className="mt-10 grid-films">
      {items.map((item) => (
        <Link key={`${item.mediaType}-${item.id}`} href={hrefFor(item)} className="film-card">
          <div className="film-still">
            <Still path={item.backdropPath} size="w780" alt="" className="h-full w-full object-cover" />
          </div>
          <p className="film-title">{item.title}</p>
        </Link>
      ))}
    </div>
  );
}
