"use client";

import { Button, Spinner } from "@heroui/react";
import { useState } from "react";

import { Still } from "@/components/still";
import { fetchCatalogue } from "@/lib/client-api";
import { formatLongDate } from "@/lib/media";
import type { TmdbEpisode, TmdbSeason, TmdbSeasonDetail } from "@/lib/types";

export function SeasonList({
  tvId,
  seasons,
  initial,
}: {
  tvId: string;
  seasons: TmdbSeason[];
  initial: TmdbSeasonDetail | null;
}) {
  const usable = seasons.filter((season) => season.season_number > 0);
  const [current, setCurrent] = useState(usable[0]?.season_number ?? 1);
  const [episodes, setEpisodes] = useState<TmdbEpisode[]>(initial?.episodes ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (usable.length === 0) return null;

  async function choose(season: number) {
    setCurrent(season);
    if (tvId.startsWith("sample-")) {
      setEpisodes([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchCatalogue<TmdbSeasonDetail>(`/tv/${tvId}/season/${season}`);
      setEpisodes(data.episodes ?? []);
    } catch {
      setEpisodes([]);
      setError("Episode list unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="sec" aria-labelledby="seasons-heading">
      <div className="sec-head">
        <h2 id="seasons-heading" className="display sec-title">
          Seasons
        </h2>
      </div>
      <div className="season-body mb-6 flex flex-wrap gap-2">
        {usable.map((season) => (
          <Button
            key={season.season_number}
            size="sm"
            variant={season.season_number === current ? "primary" : "outline"}
            onPress={() => void choose(season.season_number)}
          >
            Season {season.season_number}
          </Button>
        ))}
      </div>
      <div className="season-body">
        {loading ? <Spinner aria-label="Loading episodes" /> : null}
        {error ? <p>{error}</p> : null}
        {episodes.map((episode) => (
          <article key={episode.episode_number} className="episode">
            <div className="relative overflow-hidden rounded-lg">
              <Still path={episode.still_path} size="w300" alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="detail-k text-neutral-500">
                  S{current} · E{episode.episode_number}
                  {episode.air_date ? ` — ${formatLongDate(episode.air_date)}` : ""}
                  {episode.runtime ? ` · ${episode.runtime} min` : ""}
                </p>
              </div>
              <h3 className="text-lg font-bold uppercase">
                {episode.name || `Episode ${episode.episode_number}`}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-snug text-neutral-600">{episode.overview}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
