import "server-only";

import type { TmdbResult } from "@/lib/tmdb-result";

const PATHS: readonly RegExp[] = [
  /^\/trending\/(?:all|movie|tv)\/(?:day|week)$/,
  /^\/search\/(?:multi|movie|tv|person)$/,
  /^\/discover\/(?:movie|tv)$/,
  /^\/movie\/(?:now_playing|upcoming|popular|top_rated)$/,
  /^\/movie\/\d+$/,
  /^\/movie\/\d+\/videos$/,
  /^\/tv\/(?:popular|top_rated|on_the_air|airing_today)$/,
  /^\/tv\/\d+$/,
  /^\/tv\/\d+\/videos$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/person\/\d+$/,
  /^\/genre\/(?:movie|tv)\/list$/,
];

const QUERY_KEYS = new Set([
  "query",
  "page",
  "region",
  "append_to_response",
  "with_genres",
  "sort_by",
  "vote_average.gte",
  "vote_count.gte",
  "primary_release_date.gte",
  "primary_release_date.lte",
  "first_air_date.gte",
  "first_air_date.lte",
]);

const APPEND = new Set([
  "credits",
  "videos",
  "recommendations",
  "similar",
  "release_dates",
  "content_ratings",
  "combined_credits",
]);

export function isAllowedTmdbPath(path: string): boolean {
  return PATHS.some((pattern) => pattern.test(path));
}

export function sanitizeTmdbQuery(input: Iterable<[string, string]>): Record<string, string> {
  const raw = new Map<string, string>();
  for (const [key, value] of input) {
    if (!QUERY_KEYS.has(key)) continue;
    raw.set(key, value);
  }
  const clean: Record<string, string> = {};
  const query = raw.get("query");
  if (query) clean.query = query.slice(0, 120);
  const page = raw.get("page");
  if (page && /^\d{1,3}$/.test(page)) clean.page = page;
  const region = raw.get("region");
  if (region && /^[A-Z]{2}$/.test(region)) clean.region = region;
  const genres = raw.get("with_genres");
  if (genres && /^[\d|,]+$/.test(genres)) clean.with_genres = genres;
  const sort = raw.get("sort_by");
  if (sort && /^(popularity|vote_average|primary_release_date|first_air_date)\.(asc|desc)$/.test(sort)) {
    clean.sort_by = sort;
  }
  for (const key of [
    "vote_average.gte",
    "vote_count.gte",
    "primary_release_date.gte",
    "primary_release_date.lte",
    "first_air_date.gte",
    "first_air_date.lte",
  ] as const) {
    const value = raw.get(key);
    if (!value) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d+(\.\d+)?$/.test(value)) clean[key] = value;
  }
  const append = raw.get("append_to_response");
  if (append) {
    const parts = append
      .split(",")
      .map((part) => part.trim())
      .filter((part) => APPEND.has(part));
    if (parts.length > 0) clean.append_to_response = parts.join(",");
  }
  return clean;
}

export async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<TmdbResult<T>> {
  if (!isAllowedTmdbPath(path)) {
    return { ok: false, status: 400, error: "invalid_path" };
  }
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const key = process.env.TMDB_API_KEY;
  if (!token && !key) {
    return { ok: false, status: 503, error: "unconfigured" };
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  const clean = sanitizeTmdbQuery(Object.entries(params));
  for (const [name, value] of Object.entries(clean)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("language", "en-US");
  url.searchParams.set("include_adult", "false");

  const headers = new Headers({ accept: "application/json" });
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  } else if (key) {
    url.searchParams.set("api_key", key);
  }

  try {
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) {
      return { ok: false, status: response.status, error: "upstream" };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 502, error: "upstream" };
  }
}
