import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { readMoodQuery } from "@/lib/mood-query";

export const metadata: Metadata = {
  title: "Mood",
  description: "Search films and series by mood. Moodcut does not stream movies or series.",
};

type MoodPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default function MoodPage(props: MoodPageProps) {
  return (
    <Suspense fallback={null}>
      <MoodRedirect {...props} />
    </Suspense>
  );
}

async function MoodRedirect({ searchParams }: MoodPageProps) {
  const params = await searchParams;
  const query = readMoodQuery(params.q);
  redirect(query.length >= 2 ? `/?q=${encodeURIComponent(query)}#mood` : "/#mood");
  return null;
}
