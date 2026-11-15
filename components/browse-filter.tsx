"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const GENRES = [
  ["", "All genres"],
  ["28|12", "Action & Adventure"],
  ["16", "Animation"],
  ["35", "Comedy"],
  ["18", "Drama"],
  ["14|878", "Sci-Fi & Fantasy"],
  ["27", "Horror"],
  ["9648|53", "Mystery & Thriller"],
  ["10749", "Romance"],
] as const;

const STATUSES = [
  ["all", "All releases"],
  ["released", "Available now"],
  ["upcoming", "Upcoming / unreleased"],
] as const;

export function BrowseFilter({ genre, status }: { genre: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const active = [genre ? 1 : 0, status && status !== "all" ? 1 : 0].reduce((sum, value) => sum + value, 0);

  function go(nextGenre: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextGenre) params.set("genre", nextGenre);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    const query = params.toString();
    router.push(query ? `/browse/all?${query}` : "/browse/all");
  }

  return (
    <div className="filter-sticky">
      <div>
        <button type="button" className="filterbar" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span>Filter {active > 0 ? `(${active})` : ""}</span>
          <span>{open ? "–" : "+"}</span>
        </button>
        {open ? (
          <div className="filterpanel">
            <p className="fp-h">Genre</p>
            <div>
              {GENRES.map(([id, label]) => (
                <button key={label} type="button" className="pill" aria-pressed={(genre || "") === id} onClick={() => go(id, status)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="fp-h">Availability</p>
            <div>
              {STATUSES.map(([id, label]) => (
                <button key={id} type="button" className="pill" aria-pressed={(status || "all") === id} onClick={() => go(genre, id)}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="mt-2 text-[11px] font-bold tracking-wider uppercase" onClick={() => go("", "all")}>
              Clear all
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
