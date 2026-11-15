"use client";

import type { ReactNode } from "react";

import { RecentProvider } from "@/components/recent";
import { TrailerProvider } from "@/components/trailer-provider";
import { WatchlistProvider } from "@/components/watchlist";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WatchlistProvider>
      <RecentProvider>
        <TrailerProvider>
          {children}
        </TrailerProvider>
      </RecentProvider>
    </WatchlistProvider>
  );
}
