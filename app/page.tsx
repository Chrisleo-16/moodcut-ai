import { Suspense } from "react";

import { FilmRow } from "@/components/film-row";
import { HeroCarousel } from "@/components/hero-carousel";
import { MoodSearch } from "@/components/mood-search";
import { Newsletter } from "@/components/newsletter";
import { loadHome } from "@/lib/catalogue";
import { pickTrailer } from "@/lib/media";
import { tmdb } from "@/lib/tmdb";
import type { MediaCard, TmdbVideos } from "@/lib/types";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="hero" aria-hidden />}>
      <HomeCatalogue />
    </Suspense>
  );
}

async function HomeCatalogue() {
  const payload = await loadHome();
  const todayIso = new Date().toISOString().slice(0, 10);
  if (payload.mode === "error") {
    return (
      <section className="page-pad">
        <h1 className="display page-title">Moodcut</h1>
        <p className="mt-6 max-w-lg">{payload.message}</p>
      </section>
    );
  }
  const trailers = payload.mode === "live" ? await trailerMap(payload.hero) : previewTrailers(payload.hero);
  const still = payload.hero[0]?.backdropPath ?? payload.rows[0]?.items[0]?.backdropPath ?? null;
  return (
    <>
      <HeroCarousel items={payload.hero} todayIso={todayIso} trailers={trailers} />
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
      <MoodSearch todayIso={todayIso} />
      <Newsletter image={still} />
    </>
  );
}

async function trailerMap(items: MediaCard[]): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    items.slice(0, 10).map(async (item) => {
      const result = await tmdb<TmdbVideos>(`/${item.mediaType}/${item.id}/videos`);
      const key = result.ok ? pickTrailer(result.data.results) : null;
      return [`${item.mediaType}:${item.id}`, key] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function previewTrailers(items: MediaCard[]): Record<string, string | null> {
  return Object.fromEntries(
    items.map((item) => [`${item.mediaType}:${item.id}`, item.id === "sample-salt-line" ? "eRsGyueVLvQ" : null]),
  );
}
