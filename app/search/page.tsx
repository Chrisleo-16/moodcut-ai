import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Still } from "@/components/still";
import { loadSearch } from "@/lib/catalogue";
import { hrefFor, yearOf } from "@/lib/media";
import { previewCards } from "@/lib/preview";
import type { MediaCard, PersonCard } from "@/lib/types";

export const metadata: Metadata = { title: "Search" };

type Props = { searchParams: Promise<{ q?: string; type?: string; page?: string; sort?: string }> };

export default function SearchPage(props: Props) {
  return (
    <Suspense fallback={<section className="sr-head" aria-hidden />}>
      <SearchContent {...props} />
    </Suspense>
  );
}

async function SearchContent({ searchParams }: Props) {
  const { q = "", type = "", page = "1", sort = "relevance" } = await searchParams;
  const query = q.trim();
  const safePage = /^\d+$/.test(page) ? page : "1";
  return (
    <>
      <section className="sr-head">
        <form action="/search" className="max-w-3xl">
          <label className="s-label" htmlFor="sr-input">Search</label>
          <div className="s-field s-field--white">
            <input id="sr-input" className="s-input" name="q" defaultValue={query} placeholder="Search" aria-label="Search" />
            {type ? <input type="hidden" name="type" value={type} /> : null}
            <button className="s-submit" type="submit" aria-label="Search">→</button>
          </div>
        </form>
      </section>
      <div className="sr-body">
        {query ? <Results query={query} type={type} page={safePage} sort={sort} /> : <p className="sr-empty">Search for a film, a series, or a person.</p>}
      </div>
    </>
  );
}

async function Results({ query, type, page, sort }: { query: string; type: string; page: string; sort: string }) {
  const result = await loadSearch(query, page);
  if (result.mode === "error") return <p className="sr-empty">Search is unavailable right now.</p>;
  if (result.mode === "preview") {
    const cards = previewCards().filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
    return cards.length === 0 ? (
      <p className="sr-empty">No results for “{query}”.</p>
    ) : (
      <CoverRow title="Films" count={cards.length} items={cards} kind="poster" />
    );
  }
  const sortItems = <T extends MediaCard>(items: T[]) => sortCards(items, sort);
  if (type === "movie" || type === "tv" || type === "person") {
    const items = type === "movie" ? sortItems(result.movies) : type === "tv" ? sortItems(result.series) : [];
    const people = type === "person" ? result.people : [];
    const empty = items.length + people.length === 0;
    return (
      <>
        <SortBar query={query} type={type} sort={sort} />
        {empty ? <p className="sr-empty">No results for “{query}”.</p> : null}
        {type !== "person" ? <CoverRow title={type === "tv" ? "Television" : "Films"} count={type === "tv" ? result.seriesCount : result.movieCount} items={items} kind={type === "tv" ? "land" : "poster"} /> : null}
        {type === "person" ? <PeopleRow people={people} count={result.peopleCount} /> : null}
      </>
    );
  }
  const empty = result.movieCount + result.seriesCount + result.peopleCount === 0;
  if (empty) return <p className="sr-empty">No results for “{query}”.</p>;
  return (
    <>
      <CoverRow title="Films" count={result.movieCount} items={result.movies.slice(0, 7)} kind="poster" more={result.movieCount > 7 ? `/search?q=${encodeURIComponent(query)}&type=movie` : undefined} />
      <CoverRow title="Television" count={result.seriesCount} items={result.series.slice(0, 5)} kind="land" more={result.seriesCount > 5 ? `/search?q=${encodeURIComponent(query)}&type=tv` : undefined} />
      <PeopleRow people={result.people.slice(0, 7)} count={result.peopleCount} more={result.peopleCount > 7 ? `/search?q=${encodeURIComponent(query)}&type=person` : undefined} />
      <section className="mt-10">
        {result.movies.slice(0, 10).map((item) => (
          <article key={item.id} className="sr-post">
            <h2 className="sr-post-h">
              <Link href={hrefFor(item)}>{item.title}</Link>
              <span>Film</span>
            </h2>
            <p className="sr-post-p">
              <span className="mr-2 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">{yearOf(item.date)}</span>
              {item.overview}
            </p>
            <Link className="sr-post-v" href={hrefFor(item)}>View film</Link>
          </article>
        ))}
        <Pager query={query} page={result.page} total={result.moviePages} />
      </section>
    </>
  );
}

function CoverRow({ title, count, items, kind, more }: { title: string; count: number; items: MediaCard[]; kind: "poster" | "land"; more?: string }) {
  if (count === 0) return null;
  return (
    <section>
      <div className="sr-sechead">
        <h2 className="sr-seclabel">{title} <span>({count.toLocaleString()})</span></h2>
        {more ? <Link className="sr-viewall" href={more}>View all ›</Link> : null}
      </div>
      <div className={kind === "poster" ? "sr-covers" : "sr-lands"}>
        {items.map((item) => (
          <Link key={item.id} href={hrefFor(item)} className={kind === "poster" ? "sr-cover" : "sr-land"} aria-label={item.title}>
            <Still path={kind === "poster" ? item.posterPath : item.backdropPath ?? item.posterPath} size={kind === "poster" ? "w342" : "w780"} alt="" />
            <p className="sr-cover-t">{item.title}</p>
            <p className="sr-cover-m">{[yearOf(item.date)].filter(Boolean).join(" ")}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PeopleRow({ people, count, more }: { people: PersonCard[]; count: number; more?: string }) {
  if (count === 0) return null;
  return (
    <section>
      <div className="sr-sechead">
        <h2 className="sr-seclabel">People <span>({count.toLocaleString()})</span></h2>
        {more ? <Link className="sr-viewall" href={more}>View all ›</Link> : null}
      </div>
      <div className="sr-covers">
        {people.map((person) => (
          <Link key={person.id} href={`/person/${person.id}`} className="sr-cover" aria-label={person.name}>
            <Still path={person.profilePath} size="w185" alt="" className="aspect-square rounded-full object-cover" />
            <p className="sr-cover-t">{person.name}</p>
            <p className="sr-cover-m">{person.knownFor}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SortBar({ query, type, sort }: { query: string; type: string; sort: string }) {
  const sorts = [
    ["relevance", "Relevance"],
    ["title", "Title"],
    ["year", "Year"],
  ] as const;
  return (
    <div className="mb-4 flex gap-4 text-[11px] font-bold tracking-wider uppercase">
      {sorts.map(([value, label]) => (
        <Link key={value} href={`/search?q=${encodeURIComponent(query)}&type=${type}&sort=${value}`} aria-current={sort === value ? "page" : undefined} className={sort === value ? "underline" : "text-neutral-400"}>
          {label}
        </Link>
      ))}
    </div>
  );
}

function Pager({ query, page, total }: { query: string; page: number; total: number }) {
  if (total <= 1) return null;
  return (
    <nav className="sr-pager" aria-label="Pages">
      {page > 1 ? <Link href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}>←</Link> : <span />}
      <span>{page} of {total}</span>
      {page < total ? <Link href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}>→</Link> : <span />}
    </nav>
  );
}

function sortCards(items: MediaCard[], sort: string): MediaCard[] {
  const copy = [...items];
  if (sort === "title") copy.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "year") copy.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return copy;
}
