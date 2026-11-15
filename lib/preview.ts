import type { FilmRowModel, MediaCard } from "@/lib/types";

export type PreviewFilm = MediaCard & {
  tagline: string;
  genres: string[];
  runtime: number;
  youtubeKey: string | null;
  certification: string;
  director: string;
  cast: { id: string; name: string; character: string }[];
};

const still = (name: string) => `/preview/${name}.svg`;

export const PREVIEW_FILMS: readonly PreviewFilm[] = [
  {
    id: "sample-salt-line",
    mediaType: "movie",
    title: "Salt Line",
    date: "2026-10-02",
    overview:
      "A cartographer returns to a drowned harbor town and finds the tide has kept every name the maps left out.",
    posterPath: still("salt-line"),
    backdropPath: still("salt-line"),
    voteAverage: 7.4,
    genreIds: [18, 53],
    tagline: "The tide keeps the names.",
    genres: ["Drama", "Thriller"],
    runtime: 118,
    // Sample trailer only: "Sintel" (Blender Foundation, CC BY 3.0), official Blender YouTube upload.
    youtubeKey: "eRsGyueVLvQ",
    certification: "PG-13",
    director: "Ada Voss",
    cast: [
      { id: "sample-person-ada", name: "Mina Calder", character: "Ruth" },
      { id: "sample-person-leo", name: "Leo March", character: "Eli" },
    ],
  },
  {
    id: "sample-room-tone",
    mediaType: "movie",
    title: "Room Tone",
    date: "2026-08-14",
    overview: "A sound recordist hired for an empty hotel starts hearing scenes that have not been shot.",
    posterPath: still("room-tone"),
    backdropPath: still("room-tone"),
    voteAverage: 7.1,
    genreIds: [9648, 18],
    tagline: "Silence has a take.",
    genres: ["Mystery", "Drama"],
    runtime: 104,
    youtubeKey: null,
    certification: "R",
    director: "Jon Park",
    cast: [{ id: "sample-person-jon", name: "Nia Okonkwo", character: "June" }],
  },
  {
    id: "sample-low-country",
    mediaType: "movie",
    title: "Low Country",
    date: "2027-02-12",
    overview: "Two sisters drive a harvest truck through a county that is already celebrating a film that does not exist yet.",
    posterPath: still("low-country"),
    backdropPath: still("low-country"),
    voteAverage: null,
    genreIds: [35, 18],
    tagline: "The road is earlier than the poster.",
    genres: ["Comedy", "Drama"],
    runtime: 99,
    youtubeKey: null,
    certification: "",
    director: "Camille Hart",
    cast: [{ id: "sample-person-cam", name: "Ivy Solano", character: "Bess" }],
  },
  {
    id: "sample-after-the-bell",
    mediaType: "movie",
    title: "After the Bell",
    date: "2026-05-01",
    overview: "A night-shift jeweler and a choir director share a city block and refuse to call it a romance.",
    posterPath: still("after-the-bell"),
    backdropPath: still("after-the-bell"),
    voteAverage: 8.0,
    genreIds: [10749, 35],
    tagline: "They keep missing the last train on purpose.",
    genres: ["Romance", "Comedy"],
    runtime: 111,
    youtubeKey: null,
    certification: "PG-13",
    director: "Elena Cho",
    cast: [{ id: "sample-person-elena", name: "Samir Patel", character: "Chris" }],
  },
  {
    id: "sample-winter-market",
    mediaType: "tv",
    title: "Winter Market",
    date: "2025-11-20",
    overview: "Vendors in a river city keep a weekend market open through a winter that will not decide to end.",
    posterPath: still("winter-market"),
    backdropPath: still("winter-market"),
    voteAverage: 8.2,
    genreIds: [18],
    tagline: "Every stall has a second story.",
    genres: ["Drama"],
    runtime: 48,
    youtubeKey: null,
    certification: "TV-14",
    director: "Noah Abebe",
    cast: [{ id: "sample-person-noah", name: "Greta Lang", character: "Pia" }],
  },
  {
    id: "sample-glass-orchard",
    mediaType: "tv",
    title: "Glass Orchard",
    date: "2026-01-09",
    overview: "A botanist catalogues trees that only fruit under stadium lights, and the town that grew around them.",
    posterPath: still("glass-orchard"),
    backdropPath: still("glass-orchard"),
    voteAverage: 7.6,
    genreIds: [10765, 18],
    tagline: "The harvest starts after midnight.",
    genres: ["Science Fiction", "Drama"],
    runtime: 52,
    youtubeKey: null,
    certification: "TV-MA",
    director: "Rin Abe",
    cast: [{ id: "sample-person-rin", name: "Owen Blake", character: "Dr. Imani" }],
  },
];

export function previewFilm(id: string): PreviewFilm | undefined {
  return PREVIEW_FILMS.find((film) => film.id === id);
}

export function previewCards(): MediaCard[] {
  return PREVIEW_FILMS.map((film) => ({
    id: film.id,
    mediaType: film.mediaType,
    title: film.title,
    date: film.date,
    overview: film.overview,
    posterPath: film.posterPath,
    backdropPath: film.backdropPath,
    voteAverage: film.voteAverage,
    genreIds: film.genreIds,
  }));
}

export function previewHome(today = new Date()): { hero: MediaCard[]; rows: FilmRowModel[] } {
  const cards = previewCards();
  const movies = cards.filter((item) => item.mediaType === "movie");
  const series = cards.filter((item) => item.mediaType === "tv");
  const upcoming = movies.filter((item) => item.date && item.date > today.toISOString().slice(0, 10));
  const playing = movies.filter((item) => !upcoming.includes(item));
  return {
    hero: playing.slice(0, 4),
    rows: [
      { id: "theaters", title: "In Theaters", href: "/browse/now-playing", layout: "wide" as const, items: playing },
      { id: "soon", title: "Coming Soon", href: "/browse/upcoming", layout: "feature" as const, items: upcoming },
      { id: "trending", title: "Trending Now", href: "/browse/trending", layout: "regular" as const, items: cards },
      { id: "top", title: "Top Rated", href: "/browse/top-rated", layout: "regular" as const, showScore: true, items: playing },
      { id: "tv", title: "Television", href: "/browse/tv", layout: "regular" as const, items: series },
    ].filter((row) => row.items.length > 0),
  };
}

export function previewFeature(): { title: string; still: string; youtubeKey: string | null; mediaType: "movie"; id: string } {
  const film = PREVIEW_FILMS[0];
  if (!film) {
    return { title: "Moodcut", still: "/preview/salt-line.svg", youtubeKey: null, mediaType: "movie", id: "sample-salt-line" };
  }
  return {
    title: film.title,
    still: film.backdropPath ?? "/preview/salt-line.svg",
    youtubeKey: film.youtubeKey,
    mediaType: "movie",
    id: film.id,
  };
}
