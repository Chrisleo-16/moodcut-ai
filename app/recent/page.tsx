import type { Metadata } from "next";

import { SavedList } from "@/components/saved-list";

export const metadata: Metadata = { title: "Recently viewed" };

export default function RecentPage() {
  return (
    <section className="page-pad">
      <h1 className="display page-title px-0">Recently viewed</h1>
      <SavedList mode="recent" />
    </section>
  );
}
