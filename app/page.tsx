import { Suspense } from "react";

import { FilmRow } from "@/components/film-row";
import { MoodSearch } from "@/components/mood-search";
import { Newsletter } from "@/components/newsletter";
import { loadHome } from "@/lib/catalogue";
import { readMoodQuery } from "@/lib/mood-query";

type HomePageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default function HomePage(props: HomePageProps) {
  return (
    <Suspense fallback={<div className="mood-hero" aria-hidden />}>
      <HomeCatalogue {...props} />
    </Suspense>
  );
}

async function HomeCatalogue({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialQuery = readMoodQuery(params.q);
  const payload = await loadHome();
  const todayIso = new Date().toISOString().slice(0, 10);
  if (payload.mode === "error") {
    return (
      <>
        <MoodSearch todayIso={todayIso} initialQuery={initialQuery} />
        <section className="page-pad">
          <p className="max-w-lg">{payload.message}</p>
        </section>
      </>
    );
  }
  const still = payload.rows[0]?.items[0]?.backdropPath ?? payload.hero[0]?.backdropPath ?? null;
  return (
    <>
      <MoodSearch todayIso={todayIso} initialQuery={initialQuery} />
      {payload.mode === "preview" ? (
        <p className="preview-note">Preview titles are on screen until a TMDB key is set on the server.</p>
      ) : null}
      {payload.rows.map((row) => (
        <FilmRow
          key={row.id}
          title={row.title}
          href={row.href}
          items={row.items}
          todayIso={todayIso}
          layout={row.layout}
          showScore={row.showScore}
        />
      ))}
      <Newsletter image={still} />
    </>
  );
}
