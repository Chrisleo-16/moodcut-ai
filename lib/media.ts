import { genreNameById } from "@/lib/genres";
import type { MediaCard, MediaKind, PersonCard, TmdbListItem, TmdbVideo } from "@/lib/types";

export function imageUrl(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  if (path.startsWith("/preview/") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function asKind(value: string | undefined, fallback: MediaKind): MediaKind | null {
  if (value === "movie" || value === "tv") return value;
  if (value === "person") return null;
  return fallback;
}

export function toCard(item: TmdbListItem, fallback: MediaKind): MediaCard | null {
  const mediaType = asKind(item.media_type, fallback);
  if (!mediaType || !Number.isFinite(item.id)) return null;
  const title = (mediaType === "movie" ? item.title : item.name) ?? item.title ?? item.name;
  if (!title) return null;
  return {
    id: String(item.id),
    mediaType,
    title,
    date: (mediaType === "movie" ? item.release_date : item.first_air_date) || null,
    overview: item.overview ?? "",
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    voteAverage: typeof item.vote_average === "number" && item.vote_average > 0 ? item.vote_average : null,
    genreIds: item.genre_ids ?? [],
  };
}

export function toPerson(item: TmdbListItem): PersonCard | null {
  if (item.media_type && item.media_type !== "person") return null;
  if (!item.name || !Number.isFinite(item.id)) return null;
  const known = (item.known_for ?? [])
    .map((credit) => credit.title || credit.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 2)
    .join(", ");
  return {
    id: String(item.id),
    name: item.name,
    department: item.known_for_department || "Person",
    profilePath: item.profile_path ?? null,
    knownFor: known,
  };
}

export function yearOf(date: string | null | undefined): string {
  if (!date || date.length < 4) return "";
  return date.slice(0, 4);
}

export function formatLongDate(date: string | null | undefined): string {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const value = new Date(year, month - 1, day);
  return value
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

export function parseLocalDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function isUpcoming(date: string | null | undefined, today: Date): boolean {
  const parsed = parseLocalDate(date);
  if (!parsed) return false;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return parsed.getTime() > start.getTime();
}

export function statusChip(item: MediaCard, today: Date): string | null {
  if (isUpcoming(item.date, today)) {
    const formatted = formatLongDate(item.date);
    return item.mediaType === "tv" ? `PREMIERES ${formatted}` : `IN THEATERS ${formatted}`;
  }
  if (item.mediaType === "tv") return "SERIES";
  const parsed = parseLocalDate(item.date);
  if (!parsed) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = (start.getTime() - parsed.getTime()) / 86_400_000;
  if (days >= 0 && days <= 45) return "IN THEATERS";
  return null;
}

export function firstGenre(ids: number[]): string | null {
  for (const id of ids) {
    const name = genreNameById(id);
    if (name) return name;
  }
  return null;
}

export function hrefFor(item: Pick<MediaCard, "mediaType" | "id">): string {
  return item.mediaType === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
}

export function pickTrailer(videos: TmdbVideo[] | undefined): string | null {
  const youtube = (videos ?? []).filter((video) => video.site === "YouTube" && video.key);
  const chosen =
    youtube.find((video) => video.type === "Trailer" && video.official) ??
    youtube.find((video) => video.type === "Trailer") ??
    youtube.find((video) => video.type === "Teaser") ??
    null;
  return chosen?.key && isYoutubeKey(chosen.key) ? chosen.key : null;
}

export function isYoutubeKey(value: string): boolean {
  return /^[A-Za-z0-9_-]{6,32}$/.test(value);
}

export function youtubeEmbed(key: string): string | null {
  if (!isYoutubeKey(key)) return null;
  return `https://www.youtube-nocookie.com/embed/${key}?rel=0&autoplay=1`;
}

export function titleScale(title: string): "hero-title" | "hero-title-l" | "hero-title-xl" | "hero-title-xxl" {
  if (title.length > 28) return "hero-title-xxl";
  if (title.length > 18) return "hero-title-xl";
  if (title.length > 12) return "hero-title-l";
  return "hero-title";
}

export function runtimeLabel(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest}m`;
  return `${hours}h ${rest}m`;
}
