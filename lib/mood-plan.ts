import { genreIdsFor, genreNameById, MOOD_GENRE_NAMES } from "@/lib/genres";
import { previewCards } from "@/lib/preview";
import type { MediaCard } from "@/lib/types";

export type MoodMedia = "movie" | "tv" | "any";
export type MoodEra = "any" | "classic" | "recent" | "upcoming";

export type MoodPlan = {
  genres: string[];
  mediaType: MoodMedia;
  era: MoodEra;
  minVote: number;
};

const MEDIA = new Set<MoodMedia>(["movie", "tv", "any"]);
const ERAS = new Set<MoodEra>(["any", "classic", "recent", "upcoming"]);
const GENRES = new Set<string>(MOOD_GENRE_NAMES);

export function parseMoodPlan(text: string): MoodPlan | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.genres)) return null;
  const genres = [...new Set(record.genres.filter((genre): genre is string => typeof genre === "string" && GENRES.has(genre)))].slice(0, 3);
  if (genres.length === 0) return null;
  if (typeof record.mediaType !== "string" || !MEDIA.has(record.mediaType as MoodMedia)) return null;
  if (typeof record.era !== "string" || !ERAS.has(record.era as MoodEra)) return null;
  const minVote = typeof record.minVote === "number" ? record.minVote : Number(record.minVote);
  if (!Number.isFinite(minVote) || minVote < 0 || minVote > 10) return null;
  return {
    genres,
    mediaType: record.mediaType as MoodMedia,
    era: record.era as MoodEra,
    minVote,
  };
}

export function discoverQuery(plan: MoodPlan, kind: "movie" | "tv", today = new Date()): Record<string, string> | null {
  const ids = genreIdsFor(plan.genres, kind);
  if (ids.length === 0) return null;
  const params: Record<string, string> = {
    with_genres: ids.join("|"),
    sort_by: "popularity.desc",
  };
  if (plan.minVote > 0) {
    params["vote_average.gte"] = String(plan.minVote);
    params["vote_count.gte"] = "80";
  }
  const dateKey = kind === "movie" ? "primary_release_date" : "first_air_date";
  switch (plan.era) {
    case "any":
      return params;
    case "classic":
      params[`${dateKey}.lte`] = "1999-12-31";
      return params;
    case "recent":
      params[`${dateKey}.gte`] = "2018-01-01";
      return params;
    case "upcoming": {
      const tomorrow = new Date(today.getTime() + 86_400_000);
      params[`${dateKey}.gte`] = tomorrow.toISOString().slice(0, 10);
      return params;
    }
    default: {
      const unexpected: never = plan.era;
      throw new Error(`Unexpected era ${String(unexpected)}`);
    }
  }
}

export function examplePlan(mood: string): MoodPlan {
  const text = mood.toLowerCase();
  const genres: string[] = [];
  const add = (name: string) => {
    if (!genres.includes(name) && genres.length < 3) genres.push(name);
  };
  if (/scare|horror|creep|ghost/.test(text)) add("Horror");
  if (/laugh|funn|comed|joy|silly/.test(text)) add("Comedy");
  if (/love|roman|heart/.test(text)) add("Romance");
  if (/space|future|robot|sci-?fi/.test(text)) add("Science Fiction");
  if (/war|soldier/.test(text)) add("War");
  if (/west|cowboy/.test(text)) add("Western");
  if (/family|kids|child/.test(text)) add("Family");
  if (/animat|cartoon/.test(text)) add("Animation");
  if (/document|true story/.test(text)) add("Documentary");
  if (/crime|heist/.test(text)) add("Crime");
  if (/mystery|secret/.test(text)) add("Mystery");
  if (/thrill|tense/.test(text)) add("Thriller");
  if (/sad|rain|quiet|lonely|sunday|soft/.test(text)) add("Drama");
  if (genres.length === 0) add("Drama");

  let mediaType: MoodMedia = "any";
  if (/\b(series|show|tv)\b/.test(text)) mediaType = "tv";
  if (/\b(film|movie)\b/.test(text)) mediaType = "movie";

  let era: MoodEra = "any";
  if (/classic|old|70s|80s|90s|before 2000/.test(text)) era = "classic";
  if (/recent|new|2018|2020s/.test(text)) era = "recent";
  if (/upcoming|coming soon|not out/.test(text)) era = "upcoming";

  return { genres, mediaType, era, minVote: /best|highly rated|top rated/.test(text) ? 7 : 0 };
}

export function cardsForPlan(plan: MoodPlan, pool: MediaCard[]): MediaCard[] {
  const matched = pool.filter((card) => {
    if (plan.mediaType !== "any" && card.mediaType !== plan.mediaType) return false;
    const names = card.genreIds.map((id) => genreNameById(id)).filter((name): name is string => Boolean(name));
    return plan.genres.some((genre) => names.includes(genre));
  });
  const chosen = matched.length > 0 ? matched : pool.filter((card) => plan.mediaType === "any" || card.mediaType === plan.mediaType);
  return chosen.slice(0, 12);
}

export function previewForPlan(plan: MoodPlan): MediaCard[] {
  return cardsForPlan(plan, previewCards());
}

export function moodSummary(plan: MoodPlan): string {
  const names = plan.genres;
  const list =
    names.length <= 1
      ? (names[0] ?? "these")
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  const kind = plan.mediaType === "tv" ? "series" : plan.mediaType === "movie" ? "films" : "films and series";
  const parts = [kind];
  switch (plan.era) {
    case "any":
      break;
    case "classic":
      parts.push("classic");
      break;
    case "recent":
      parts.push("recent");
      break;
    case "upcoming":
      parts.push("upcoming");
      break;
    default: {
      const unexpected: never = plan.era;
      parts.push(String(unexpected));
    }
  }
  if (plan.minVote > 0) {
    const score = Number.isInteger(plan.minVote) ? String(plan.minVote) : String(Math.round(plan.minVote * 10) / 10);
    parts.push(`rated ${score} and up`);
  }
  return `From your mood, we picked ${list} ${parts.join(", ")}.`;
}
