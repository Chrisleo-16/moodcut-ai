"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

import type { MediaKind } from "@/lib/types";

const STORAGE_KEY = "moodcut:recent";
const CHANGE_EVENT = "moodcut-recent";

export type RecentTitle = {
  id: string;
  mediaType: MediaKind;
  title: string;
  backdropPath: string | null;
  year: string;
};

type RecentValue = {
  items: RecentTitle[];
  push: (item: RecentTitle) => void;
};

const RecentContext = createContext<RecentValue | null>(null);

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}

function readRaw() {
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function parse(raw: string): RecentTitle[] {
  try {
    const parsed = JSON.parse(raw) as RecentTitle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function RecentProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const items = useMemo(() => parse(raw), [raw]);
  const value = useMemo<RecentValue>(
    () => ({
      items,
      push: rememberTitle,
    }),
    [items],
  );
  return <RecentContext.Provider value={value}>{children}</RecentContext.Provider>;
}

export function useRecent(): RecentValue {
  const value = useContext(RecentContext);
  if (!value) throw new Error("useRecent must be used inside RecentProvider");
  return value;
}

export function rememberTitle(item: RecentTitle) {
  const next = [item, ...parse(readRaw()).filter((entry) => !(entry.mediaType === item.mediaType && entry.id === item.id))].slice(0, 20);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function RememberRecent({ item }: { item: RecentTitle }) {
  const { id, mediaType, title, backdropPath, year } = item;
  useEffect(() => {
    const timer = window.setTimeout(() => rememberTitle({ id, mediaType, title, backdropPath, year }), 0);
    return () => window.clearTimeout(timer);
  }, [id, mediaType, title, backdropPath, year]);
  return null;
}
