import "server-only";

import { connection } from "next/server";

import { previewFilm, previewHome } from "@/lib/preview";
import { tmdb } from "@/lib/tmdb";
import { isUpcoming, pickTrailer, toCard, toPerson } from "@/lib/media";
import type {
  FilmRowModel,
  HomePayload,
  MediaCard,
  PersonCard,
  TmdbDetail,
  TmdbPaged,
  TmdbSeasonDetail,
} from "@/lib/types";

function cards(data: TmdbPaged | undefined, fallback: "movie" | "tv"): MediaCard[] {
  return (data?.results ?? [])
    .map((item) => toCard(item, fallback))
    .filter((item): item is MediaCard => item !== null);
}

export async function loadHome(): Promise<HomePayload> {
  await connection();
  const today = new Date();
  const [trending, playing, upcoming, top, television] = await Promise.all([
    tmdb<TmdbPaged>("/trending/all/day"),
    tmdb<TmdbPaged>("/movie/now_playing", { region: "US" }),
    tmdb<TmdbPaged>("/movie/upcoming", { region: "US" }),
    tmdb<TmdbPaged>("/movie/top_rated"),
    tmdb<TmdbPaged>("/tv/popular"),
  ]);

  const results = [trending, playing, upcoming, top, television];
  if (results.every((result) => !result.ok && result.error === "unconfigured")) {
    const preview = previewHome(today);
    return { mode: "preview", ...preview };
  }
  if (results.every((result) => !result.ok)) {
    return { mode: "error", message: "The catalogue could not be loaded. Try again in a moment." };
  }

  const hero = cards(playing.ok ? playing.data : undefined, "movie")
    .filter((item) => item.backdropPath)
    .slice(0, 10);
  const soon = cards(upcoming.ok ? upcoming.data : undefined, "movie")
    .filter((item) => item.backdropPath && isUpcoming(item.date, today))
    .sort((a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : 0));
  const rows: FilmRowModel[] = [
    {
      id: "theaters",
      title: "In Theaters",
      href: "/browse/now-playing",
      layout: "wide" as const,
      items: cards(playing.ok ? playing.data : undefined, "movie").filter((item) => item.backdropPath),
    },
    { id: "soon", title: "Coming Soon", href: "/browse/upcoming", layout: "feature" as const, items: soon },
    {
      id: "trending",
      title: "Trending Now",
      href: "/browse/trending",
      layout: "regular" as const,
      items: cards(trending.ok ? trending.data : undefined, "movie").filter((item) => item.backdropPath),
    },
    {
      id: "top",
      title: "Top Rated",
      href: "/browse/top-rated",
      layout: "regular" as const,
      showScore: true,
      items: cards(top.ok ? top.data : undefined, "movie").filter((item) => item.backdropPath),
    },
    {
      id: "tv",
      title: "Television",
      href: "/browse/tv",
      layout: "regular" as const,
      items: cards(television.ok ? television.data : undefined, "tv").filter((item) => item.backdropPath),
    },
  ].filter((row) => row.items.length > 0);

  return { mode: "live", hero: hero.length > 0 ? hero : rows[0]?.items.slice(0, 5) ?? [], rows };
}

export async function loadDetail(kind: "movie" | "tv", id: string): Promise<TmdbDetail | "preview" | "missing" | "error"> {
  await connection();
  if (id.startsWith("sample-")) {
    return previewFilm(id) ? "preview" : "missing";
  }
  if (!/^\d+$/.test(id)) return "missing";
  const append =
    kind === "movie"
      ? "credits,videos,recommendations,similar,release_dates"
      : "credits,videos,recommendations,similar,content_ratings";
  const result = await tmdb<TmdbDetail>(`/${kind}/${id}`, { append_to_response: append });
  if (!result.ok && result.error === "unconfigured") return "missing";
  if (!result.ok && result.status === 404) return "missing";
  if (!result.ok) return "error";
  return result.data;
}

export async function loadSeason(id: string, season: string): Promise<TmdbSeasonDetail | null> {
  await connection();
  if (!/^\d+$/.test(id) || !/^\d+$/.test(season)) return null;
  const result = await tmdb<TmdbSeasonDetail>(`/tv/${id}/season/${season}`);
  return result.ok ? result.data : null;
}

export async function loadPerson(id: string): Promise<TmdbDetail | "missing" | "error"> {
  await connection();
  if (!/^\d+$/.test(id)) return "missing";
  const result = await tmdb<TmdbDetail>(`/person/${id}`, { append_to_response: "combined_credits" });
  if (!result.ok && (result.error === "unconfigured" || result.status === 404)) return "missing";
  if (!result.ok) return "error";
  return result.data;
}

export async function loadSearch(query: string, page = "1"): Promise<
  | {
      mode: "live";
      movies: MediaCard[];
      series: MediaCard[];
      people: PersonCard[];
      movieCount: number;
      seriesCount: number;
      peopleCount: number;
      page: number;
      moviePages: number;
    }
  | { mode: "preview" }
  | { mode: "error" }
> {
  await connection();
  const [movies, series, people] = await Promise.all([
    tmdb<TmdbPaged>("/search/movie", { query, page }),
    tmdb<TmdbPaged>("/search/tv", { query, page }),
    tmdb<TmdbPaged>("/search/person", { query, page: "1" }),
  ]);
  if ([movies, series, people].every((result) => !result.ok && result.error === "unconfigured")) return { mode: "preview" };
  if ([movies, series, people].every((result) => !result.ok)) return { mode: "error" };
  return {
    mode: "live",
    movies: cards(movies.ok ? movies.data : undefined, "movie"),
    series: cards(series.ok ? series.data : undefined, "tv"),
    people: (people.ok ? people.data.results ?? [] : []).map((item) => toPerson({ ...item, media_type: "person" })).filter((item): item is PersonCard => item !== null),
    movieCount: movies.ok ? movies.data.total_results ?? 0 : 0,
    seriesCount: series.ok ? series.data.total_results ?? 0 : 0,
    peopleCount: people.ok ? people.data.total_results ?? 0 : 0,
    page: movies.ok ? movies.data.page ?? 1 : 1,
    moviePages: movies.ok ? Math.min(movies.data.total_pages ?? 1, 20) : 1,
  };
}

const BROWSE = {
  "now-playing": { title: "In Theaters", path: "/movie/now_playing", kind: "movie", params: { region: "US" } },
  upcoming: { title: "Coming Soon", path: "/movie/upcoming", kind: "movie", params: { region: "US" } },
  trending: { title: "Trending", path: "/trending/all/day", kind: "movie", params: {} },
  "top-rated": { title: "Top Rated", path: "/movie/top_rated", kind: "movie", params: {} },
  tv: { title: "Television", path: "/tv/popular", kind: "tv", params: {} },
  "tv-top": { title: "Top Rated Series", path: "/tv/top_rated", kind: "tv", params: {} },
  all: { title: "All Titles", path: "/discover/movie", kind: "movie", params: { sort_by: "popularity.desc" } },
} as const;

export type BrowseList = keyof typeof BROWSE;

export function isBrowseList(value: string): value is BrowseList {
  return value in BROWSE;
}

export function browseTitle(list: BrowseList): string {
  return BROWSE[list].title;
}

export async function loadBrowse(list: BrowseList, page: string, filters: { genre?: string; status?: string } = {}): Promise<
  | { mode: "live"; title: string; items: MediaCard[]; page: number; totalPages: number }
  | { mode: "preview"; title: string; items: MediaCard[] }
  | { mode: "error"; title: string }
> {
  await connection();
  const config = BROWSE[list];
  const params: Record<string, string> = { ...config.params, page };
  if (list === "all") {
    if (filters.genre && /^[\d|]+$/.test(filters.genre)) params.with_genres = filters.genre;
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    if (filters.status === "released") params["primary_release_date.lte"] = iso;
    if (filters.status === "upcoming") params["primary_release_date.gte"] = iso;
  }
  const result = await tmdb<TmdbPaged>(config.path, params);
  if (!result.ok && result.error === "unconfigured") {
    const preview = previewHome();
    const items =
      list === "tv" || list === "tv-top"
        ? preview.rows.find((row) => row.id === "tv")?.items ?? []
        : list === "upcoming"
          ? preview.rows.find((row) => row.id === "soon")?.items ?? []
          : preview.hero;
    return { mode: "preview", title: config.title, items };
  }
  if (!result.ok) return { mode: "error", title: config.title };
  let items = cards(result.data, config.kind);
  if (list === "upcoming") {
    const today = new Date();
    items = items.filter((item) => isUpcoming(item.date, today));
  }
  return {
    mode: "live",
    title: config.title,
    items,
    page: result.data.page ?? 1,
    totalPages: Math.min(result.data.total_pages ?? 1, 20),
  };
}

export function trailerFromDetail(detail: TmdbDetail): string | null {
  return pickTrailer(detail.videos?.results);
}
