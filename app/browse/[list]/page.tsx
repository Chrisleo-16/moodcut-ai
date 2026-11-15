import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BrowseFilter } from "@/components/browse-filter";
import { FilmGrid } from "@/components/film-row";
import { browseTitle, isBrowseList, loadBrowse, type BrowseList } from "@/lib/catalogue";

type Props = {
  params: Promise<{ list: string }>;
  searchParams: Promise<{ page?: string; genre?: string; status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { list } = await params;
  if (!isBrowseList(list)) return { title: "Browse" };
  return { title: browseTitle(list) };
}

export default function BrowsePage(props: Props) {
  return (
    <Suspense fallback={<section className="page-pad" aria-hidden />}>
      <BrowseContent {...props} />
    </Suspense>
  );
}

async function BrowseContent({ params, searchParams }: Props) {
  const { list } = await params;
  if (!isBrowseList(list)) notFound();
  const { page = "1", genre = "", status = "all" } = await searchParams;
  const safePage = /^\d+$/.test(page) ? page : "1";
  const result = await loadBrowse(list, safePage, { genre, status });
  const todayIso = new Date().toISOString().slice(0, 10);
  const subtitle = [genreName(genre), status === "released" ? "Available now" : status === "upcoming" ? "Upcoming / unreleased" : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <section className="page-pad">
      <h1 className="display page-title px-0">{result.title}</h1>
      {subtitle ? <p className="mt-3 text-[11px] font-bold tracking-wider uppercase">{subtitle}</p> : null}
      {list === "all" ? <div className="mt-8"><BrowseFilter genre={genre} status={status} /></div> : null}
      {result.mode === "error" ? <p className="mt-8">This list could not be loaded.</p> : null}
      {result.mode === "preview" ? (
        <p className="preview-note px-0">Preview titles. Add a TMDB key for the live list.</p>
      ) : null}
      {result.mode !== "error" ? <div className="mt-10"><FilmGrid items={result.items} todayIso={todayIso} /></div> : null}
      {result.mode === "live" ? <Pager list={list} page={result.page} total={result.totalPages} /> : null}
    </section>
  );
}

function genreName(id: string): string {
  const names: Record<string, string> = {
    "28|12": "Action & Adventure",
    "16": "Animation",
    "35": "Comedy",
    "18": "Drama",
    "14|878": "Sci-Fi & Fantasy",
    "27": "Horror",
    "9648|53": "Mystery & Thriller",
    "10749": "Romance",
  };
  return names[id] ?? "";
}

function Pager({ list, page, total }: { list: BrowseList; page: number; total: number }) {
  if (total <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-center gap-4 text-sm font-bold" aria-label="Pages">
      {page > 1 ? (
        <Link href={`/browse/${list}?page=${page - 1}`} className="pager-btn">
          Previous
        </Link>
      ) : null}
      <span className="px-3 py-2 text-neutral-600">
        Page {page} of {total}
      </span>
      {page < total ? (
        <Link href={`/browse/${list}?page=${page + 1}`} className="pager-btn">
          Next
        </Link>
      ) : null}
    </nav>
  );
}
