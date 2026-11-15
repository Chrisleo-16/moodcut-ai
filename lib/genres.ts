export type MoodGenre = {
  name: string;
  movie: number | null;
  tv: number | null;
};

/** Names the mood model may return, mapped here to TMDB genre ids. */
export const MOOD_GENRES: readonly MoodGenre[] = [
  { name: "Action", movie: 28, tv: 10759 },
  { name: "Adventure", movie: 12, tv: 10759 },
  { name: "Animation", movie: 16, tv: 16 },
  { name: "Comedy", movie: 35, tv: 35 },
  { name: "Crime", movie: 80, tv: 80 },
  { name: "Documentary", movie: 99, tv: 99 },
  { name: "Drama", movie: 18, tv: 18 },
  { name: "Family", movie: 10751, tv: 10751 },
  { name: "Fantasy", movie: 14, tv: 10765 },
  { name: "History", movie: 36, tv: null },
  { name: "Horror", movie: 27, tv: null },
  { name: "Music", movie: 10402, tv: null },
  { name: "Mystery", movie: 9648, tv: 9648 },
  { name: "Romance", movie: 10749, tv: null },
  { name: "Science Fiction", movie: 878, tv: 10765 },
  { name: "Thriller", movie: 53, tv: 9648 },
  { name: "War", movie: 10752, tv: 10768 },
  { name: "Western", movie: 37, tv: 37 },
] as const;

export const MOOD_GENRE_NAMES: readonly string[] = MOOD_GENRES.map((genre) => genre.name);

const GENRE_BY_NAME = new Map(MOOD_GENRES.map((genre) => [genre.name, genre]));

const GENRE_LABEL_BY_ID: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

export function genreNameById(id: number | undefined): string | null {
  if (id === undefined) return null;
  return GENRE_LABEL_BY_ID[id] ?? null;
}

export function genreIdsFor(names: readonly string[], kind: "movie" | "tv"): number[] {
  const ids = names
    .map((name) => GENRE_BY_NAME.get(name)?.[kind] ?? null)
    .filter((id): id is number => id !== null);
  return [...new Set(ids)];
}
