import type { Metadata } from "next";

import { SavedList } from "@/components/saved-list";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <section className="page-pad">
      <h1 className="display page-title px-0">Saved</h1>
      <p className="mt-4 max-w-lg text-sm">Titles you save stay in this browser. Nothing here plays a film.</p>
      <SavedList />
    </section>
  );
}
