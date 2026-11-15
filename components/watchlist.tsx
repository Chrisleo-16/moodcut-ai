"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import type { MediaKind } from "@/lib/types";

const STORAGE_KEY = "moodcut:saved";
const CHANGE_EVENT = "moodcut-saved";

export type SavedTitle = {
  id: string;
  mediaType: MediaKind;
  title: string;
  backdropPath: string | null;
  year: string;
};

type WatchlistValue = {
  items: SavedTitle[];
  ready: boolean;
  isSaved: (mediaType: MediaKind, id: string) => boolean;
  toggle: (item: SavedTitle) => void;
};

const WatchlistContext = createContext<WatchlistValue | null>(null);

function subscribe(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}

function readRaw(): string {
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function parseSaved(raw: string): SavedTitle[] {
  try {
    const parsed = JSON.parse(raw) as SavedTitle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const items = useMemo(() => parseSaved(raw), [raw]);

  const value = useMemo<WatchlistValue>(
    () => ({
      items,
      ready: true,
      isSaved: (mediaType, id) => items.some((item) => item.mediaType === mediaType && item.id === id),
      toggle: (item) => {
        const current = parseSaved(readRaw());
        const exists = current.some((entry) => entry.mediaType === item.mediaType && entry.id === item.id);
        const next = exists
          ? current.filter((entry) => !(entry.mediaType === item.mediaType && entry.id === item.id))
          : [item, ...current].slice(0, 40);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(CHANGE_EVENT));
      },
    }),
    [items],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistValue {
  const value = useContext(WatchlistContext);
  if (!value) throw new Error("useWatchlist must be used inside WatchlistProvider");
  return value;
}
