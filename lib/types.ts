export type MediaKind = "movie" | "tv";

export type MediaCard = {
  id: string;
  mediaType: MediaKind;
  title: string;
  date: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  genreIds: number[];
};

export type TmdbListItem = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
  popularity?: number;
  known_for_department?: string;
  known_for?: TmdbListItem[];
};

export type TmdbPaged = {
  page?: number;
  total_pages?: number;
  total_results?: number;
  results?: TmdbListItem[];
};

export type TmdbVideo = {
  key?: string;
  site?: string;
  type?: string;
  official?: boolean;
  name?: string;
};

export type TmdbVideos = {
  results?: TmdbVideo[];
};

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbCast = {
  id: number;
  name: string;
  character?: string;
  job?: string;
  department?: string;
  profile_path?: string | null;
  order?: number;
};

export type TmdbCrew = TmdbCast;

export type TmdbDetail = TmdbListItem & {
  tagline?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  in_production?: boolean;
  genres?: TmdbGenre[];
  vote_count?: number;
  original_title?: string;
  original_name?: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  homepage?: string | null;
  created_by?: TmdbCast[];
  seasons?: TmdbSeason[];
  credits?: { cast?: TmdbCast[]; crew?: TmdbCrew[] };
  videos?: TmdbVideos;
  recommendations?: TmdbPaged;
  similar?: TmdbPaged;
  combined_credits?: { cast?: TmdbCredit[]; crew?: TmdbCredit[] };
  release_dates?: {
    results?: {
      iso_3166_1?: string;
      release_dates?: { certification?: string }[];
    }[];
  };
  content_ratings?: {
    results?: { iso_3166_1?: string; rating?: string }[];
  };
};

export type TmdbSeason = {
  id?: number;
  name?: string;
  season_number: number;
  episode_count?: number;
  air_date?: string | null;
  overview?: string;
  poster_path?: string | null;
};

export type TmdbEpisode = {
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string | null;
  runtime?: number | null;
  still_path?: string | null;
};

export type TmdbSeasonDetail = {
  episodes?: TmdbEpisode[];
};

export type TmdbCredit = TmdbListItem & {
  character?: string;
  job?: string;
};

export type PersonCard = {
  id: string;
  name: string;
  department: string;
  profilePath: string | null;
  knownFor: string;
};

export type FilmRowLayout = "wide" | "feature" | "regular";

export type FilmRowModel = {
  id: string;
  title: string;
  href: string;
  items: MediaCard[];
  layout: FilmRowLayout;
  showScore?: boolean;
};

export type HomePayload =
  | { mode: "live"; hero: MediaCard[]; rows: FilmRowModel[] }
  | { mode: "preview"; hero: MediaCard[]; rows: FilmRowModel[] }
  | { mode: "error"; message: string };
