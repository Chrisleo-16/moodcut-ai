import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DetailView, PreviewDetail } from "@/components/detail-view";
import { loadDetail, loadSeason, trailerFromDetail } from "@/lib/catalogue";
import { previewFilm } from "@/lib/preview";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sample = previewFilm(id);
  if (sample) return { title: sample.title };
  const detail = await loadDetail("tv", id);
  if (detail === "preview" || detail === "missing" || detail === "error") return { title: "Series" };
  return { title: detail.name || detail.title || "Series" };
}

export default function TvPage(props: Props) {
  return (
    <Suspense fallback={<div className="hero" aria-hidden />}>
      <TvContent {...props} />
    </Suspense>
  );
}

async function TvContent({ params }: Props) {
  const { id } = await params;
  const detail = await loadDetail("tv", id);
  if (detail === "preview") return <PreviewDetail id={id} />;
  if (detail === "missing") notFound();
  if (detail === "error") {
    return (
      <section className="page-pad">
        <h1 className="display page-title">Unavailable</h1>
        <p className="mt-6">This series could not be loaded.</p>
      </section>
    );
  }
  const first = (detail.seasons ?? []).find((season) => season.season_number > 0);
  const season = first ? await loadSeason(id, String(first.season_number)) : null;
  return (
    <DetailView
      kind="tv"
      detail={detail}
      trailerKey={trailerFromDetail(detail)}
      todayIso={new Date().toISOString().slice(0, 10)}
      firstSeason={season}
    />
  );
}
