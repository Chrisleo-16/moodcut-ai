import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FilmRow } from "@/components/film-row";
import { Still } from "@/components/still";
import { loadPerson } from "@/lib/catalogue";
import { formatLongDate, toCard } from "@/lib/media";
import type { MediaCard, TmdbCredit } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const person = await loadPerson(id);
  if (person === "missing" || person === "error") return { title: "Person" };
  return { title: person.name || "Person" };
}

export default function PersonPage(props: Props) {
  return (
    <Suspense fallback={<div className="page-pad" aria-hidden />}>
      <PersonContent {...props} />
    </Suspense>
  );
}

async function PersonContent({ params }: Props) {
  const { id } = await params;
  const person = await loadPerson(id);
  if (person === "missing") notFound();
  if (person === "error") {
    return (
      <section className="page-pad">
        <h1 className="display page-title">Unavailable</h1>
        <p className="mt-6">This profile could not be loaded.</p>
      </section>
    );
  }
  const credits = knownFor(person.combined_credits?.cast ?? [], person.combined_credits?.crew ?? []);
  const facts = [
    ["Known for", person.known_for_department ?? ""],
    ["Born", formatLongDate(person.birthday)],
    ["Place of birth", person.place_of_birth ?? ""],
    ["Died", formatLongDate(person.deathday)],
  ].filter((row) => row[1]);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="page-pad pb-0">
        <p className="text-xs font-bold tracking-widest uppercase">{person.known_for_department || "Person"}</p>
        <h1 className="display page-title px-0">{person.name}</h1>
      </div>
      <section className="sec">
        <div className="detail-grid">
          <Still path={person.profile_path} size="w500" alt="" className="detail-poster" />
          <div>
            <h2 className="detail-h">Biography</h2>
            <p className="detail-syn text-base leading-relaxed">{truncate(person.biography || "No biography yet.", 1100)}</p>
          </div>
          <div>
            <h2 className="detail-h">Details</h2>
            {facts.map(([label, value]) => (
              <div key={label}>
                <div className="detail-k">{label}</div>
                <div className="detail-v">{value}</div>
              </div>
            ))}
            <Link href="/" className="text-xs font-bold uppercase underline">
              Back to the catalogue
            </Link>
          </div>
        </div>
      </section>
      <FilmRow title="Known For" items={credits} todayIso={todayIso} layout="regular" />
    </>
  );
}

function knownFor(cast: TmdbCredit[], crew: TmdbCredit[]): MediaCard[] {
  const merged = [...cast, ...crew];
  const seen = new Set<string>();
  const cards: MediaCard[] = [];
  const sorted = [...merged].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  for (const credit of sorted) {
    const card = toCard(credit, credit.media_type === "tv" ? "tv" : "movie");
    if (!card || !card.backdropPath) continue;
    const key = `${card.mediaType}:${card.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(card);
    if (cards.length >= 18) break;
  }
  return cards;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}
