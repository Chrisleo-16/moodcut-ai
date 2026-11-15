import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DetailView, PreviewDetail } from "@/components/detail-view";
import { loadDetail, trailerFromDetail } from "@/lib/catalogue";
import { previewFilm } from "@/lib/preview";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sample = previewFilm(id);
  if (sample) return { title: sample.title };
  const detail = await loadDetail("movie", id);
  if (detail === "preview" || detail === "missing" || detail === "error") return { title: "Film" };
  return { title: detail.title || detail.name || "Film" };
}

export default function MoviePage(props: Props) {
  return (
    <Suspense fallback={<div className="hero" aria-hidden />}>
      <MovieContent {...props} />
    </Suspense>
  );
}

async function MovieContent({ params }: Props) {
  const { id } = await params;
  const detail = await loadDetail("movie", id);
  if (detail === "preview") return <PreviewDetail id={id} />;
  if (detail === "missing") notFound();
  if (detail === "error") {
    return (
      <section className="page-pad">
        <h1 className="display page-title">Unavailable</h1>
        <p className="mt-6">This film could not be loaded.</p>
      </section>
    );
  }
  return (
    <DetailView
      kind="movie"
      detail={detail}
      trailerKey={trailerFromDetail(detail)}
      todayIso={new Date().toISOString().slice(0, 10)}
      firstSeason={null}
    />
  );
}
