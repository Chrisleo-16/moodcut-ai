import Link from "next/link";

import { FilmRow, ScrollRow } from "@/components/film-row";
import { HeroCarousel } from "@/components/hero-carousel";
import { RememberRecent } from "@/components/recent";
import { SeasonList } from "@/components/season-list";
import { Still } from "@/components/still";
import { TrailerButton } from "@/components/trailer-provider";
import { formatLongDate, runtimeLabel, toCard, yearOf } from "@/lib/media";
import { previewFilm } from "@/lib/preview";
import type { MediaCard, TmdbDetail, TmdbSeasonDetail } from "@/lib/types";

export function DetailView({
  kind,
  detail,
  trailerKey,
  todayIso,
  firstSeason,
  publicId,
}: {
  kind: "movie" | "tv";
  detail: TmdbDetail;
  trailerKey: string | null;
  todayIso: string;
  firstSeason: TmdbSeasonDetail | null;
  publicId?: string;
}) {
  const title = detail.title || detail.name || "Untitled";
  const date = detail.release_date || detail.first_air_date || null;
  const directors =
    kind === "movie"
      ? (detail.credits?.crew ?? []).filter((person) => person.job === "Director")
      : (detail.created_by ?? []);
  const writers = kind === "movie"
    ? uniquePeople((detail.credits?.crew ?? []).filter((person) => person.department === "Writing")).slice(0, 3)
    : [];
  const cast = (detail.credits?.cast ?? []).slice(0, 16);
  const recommendations = ((detail.recommendations?.results?.length ? detail.recommendations.results : detail.similar?.results) ?? [])
    .map((item) => toCard(item, kind))
    .filter((item): item is MediaCard => item !== null && Boolean(item.backdropPath));
  const facts = ([
    [kind === "movie" ? "Directed by" : "Created by", people(directors)],
    ["Starring", people(cast.slice(0, 4))],
    ["Written by", people(writers)],
    ["Runtime", kind === "movie" ? runtimeLabel(detail.runtime) : runtimeLabel(detail.episode_run_time?.[0])],
    ["Seasons", kind === "tv" ? `${detail.number_of_seasons ?? 0} seasons · ${detail.number_of_episodes ?? 0} episodes` : ""],
    ["Genres", (detail.genres ?? []).map((genre) => genre.name).join(", ")],
    [kind === "movie" ? "Release date" : "First aired", formatLongDate(date)],
    ["Rated", certification(detail, kind)],
    ["TMDB score", detail.vote_average ? `${detail.vote_average.toFixed(1)} / 10 · ${(detail.vote_count ?? 0).toLocaleString()} votes` : ""],
  ] as [string, string | string[]][]).filter((row) => (Array.isArray(row[1]) ? row[1].length > 0 : Boolean(row[1])));

  const card: MediaCard = {
    id: publicId ?? String(detail.id),
    mediaType: kind,
    title,
    date,
    overview: detail.overview ?? "",
    posterPath: detail.poster_path ?? null,
    backdropPath: detail.backdrop_path ?? null,
    voteAverage: typeof detail.vote_average === "number" ? detail.vote_average : null,
    genreIds: (detail.genres ?? []).map((genre) => genre.id),
  };

  return (
    <>
      {card.id.startsWith("sample-") ? null : (
        <RememberRecent
          item={{ id: card.id, mediaType: kind, title, backdropPath: card.backdropPath, year: yearOf(date) }}
        />
      )}
      <HeroCarousel
        items={[card]}
        todayIso={todayIso}
        trailers={{ [`${kind}:${card.id}`]: trailerKey }}
        single
        tagline={detail.tagline}
      />
      <section className="sec">
        <div className="detail-grid">
          <Still path={detail.poster_path} size="w500" shape="portrait" sizes="240px" alt={`${title} poster`} className="detail-poster" />
          <div>
            <h2 className="detail-h">Synopsis</h2>
            <p className="detail-syn">{detail.overview || "No synopsis yet."}</p>
            <div className="mt-6">
              <TrailerButton youtubeKey={trailerKey} title={title} label="Watch trailer" tone="dark" />
            </div>
          </div>
          <div>
            <h2 className="detail-h">Additional details</h2>
            {facts.map(([label, value]) => (
              <div key={label}>
                <div className="detail-k">{label}</div>
                <div className="detail-v">
                  {Array.isArray(value) ? value.map((name) => <div key={name}>{name}</div>) : value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {kind === "tv" ? <SeasonList tvId={String(detail.id)} seasons={detail.seasons ?? []} initial={firstSeason} /> : null}
      {cast.length > 0 ? (
        <ScrollRow title="Cast">
          {cast.map((person) => (
            <Link key={person.id} href={`/person/${person.id}`} className="film-card portrait" aria-label={person.name}>
              <div className="film-still">
                <Still path={person.profile_path} size="w342" shape="portrait" sizes="(max-width: 767px) 42vw, 200px" alt="" className="h-full w-full object-cover" />
              </div>
              <div className="film-title">
                <span>{person.name}</span>
              </div>
              {person.character ? <p className="film-sub">{person.character}</p> : null}
            </Link>
          ))}
        </ScrollRow>
      ) : null}
      <FilmRow title="More Like This" items={recommendations} todayIso={todayIso} layout="regular" />
    </>
  );
}

export function PreviewDetail({ id }: { id: string }) {
  const film = previewFilm(id);
  if (!film) return null;
  const detail: TmdbDetail = {
    id: 0,
    title: film.title,
    name: film.title,
    overview: film.overview,
    tagline: film.tagline,
    backdrop_path: film.backdropPath,
    poster_path: film.posterPath,
    release_date: film.mediaType === "movie" ? film.date ?? undefined : undefined,
    first_air_date: film.mediaType === "tv" ? film.date ?? undefined : undefined,
    vote_average: film.voteAverage ?? undefined,
    vote_count: film.voteAverage ? 1284 : undefined,
    runtime: film.runtime,
    genres: film.genres.map((name, index) => ({ id: index, name })),
  };
  return (
    <DetailView
      kind={film.mediaType}
      detail={detail}
      publicId={id}
      trailerKey={film.youtubeKey}
      todayIso={new Date().toISOString().slice(0, 10)}
      firstSeason={null}
    />
  );
}

function people(list: { id: number; name: string }[]): string[] {
  return list.map((person) => person.name);
}

function uniquePeople<T extends { id: number }>(list: T[]): T[] {
  const seen = new Set<number>();
  return list.filter((person) => {
    if (seen.has(person.id)) return false;
    seen.add(person.id);
    return true;
  });
}

function certification(detail: TmdbDetail, kind: "movie" | "tv"): string {
  if (kind === "movie") {
    const us = detail.release_dates?.results?.find((entry) => entry.iso_3166_1 === "US");
    return us?.release_dates?.find((entry) => entry.certification)?.certification ?? "";
  }
  return detail.content_ratings?.results?.find((entry) => entry.iso_3166_1 === "US")?.rating ?? "";
}
