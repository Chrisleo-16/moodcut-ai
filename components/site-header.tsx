"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useWatchlist } from "@/components/watchlist";
import { CatalogueError, fetchCatalogue } from "@/lib/client-api";
import { firstGenre, imageUrl, toCard, toPerson } from "@/lib/media";
import { looksLikeMood, moodSearchHref } from "@/lib/mood-query";
import { previewCards } from "@/lib/preview";
import type { TmdbPaged } from "@/lib/types";

const LINKS = [
  { href: "/browse/all", label: "Browse the Films", em: false },
  { href: "/browse/trending", label: "Trending", em: true },
  { href: "/browse/upcoming", label: "Coming Soon", em: false },
  { href: "/browse/tv", label: "Television", em: false },
] as const;

const GENRES = [
  ["28|12", "Action & Adventure"],
  ["16", "Animation"],
  ["35", "Comedy"],
  ["18", "Drama"],
  ["14|878", "Sci-Fi & Fantasy"],
  ["27", "Horror"],
  ["9648|53", "Mystery & Thriller"],
  ["10749", "Romance"],
] as const;

type SearchPick =
  | { kind: "mood"; query: string }
  | { kind: "title"; href: string };

type Suggestion = {
  href: string;
  title: string;
  meta: string;
  metaEm?: string;
  image: string | null;
  group: "Films" | "Television" | "People";
  round?: boolean;
};

export function SiteHeader() {
  const path = usePathname();
  const router = useRouter();
  const light = path.startsWith("/movie/") || path.startsWith("/tv/");
  const { items } = useWatchlist();
  const [sticky, setSticky] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [account, setAccount] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stamp, setStamp] = useState("");
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    let last = window.scrollY;
    let upward = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = last - y;
      if (y < 252) {
        upward = 0;
        setSticky(false);
      } else if (delta > 0) {
        upward += delta;
        if (upward > 200) setSticky(true);
      } else if (delta < 0) {
        upward = 0;
        setSticky(false);
      }
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("hdr-shown", sticky);
  }, [sticky]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await fetchCatalogue<TmdbPaged>("/search/multi", { query: trimmed });
          const next: Suggestion[] = [];
          for (const item of data.results ?? []) {
            const person = toPerson(item);
            if (person) {
              next.push({
                href: `/person/${person.id}`,
                title: person.name,
                meta: person.department,
                metaEm: person.knownFor || undefined,
                image: imageUrl(person.profilePath, "w185"),
                group: "People",
                round: true,
              });
              continue;
            }
            const card = toCard(item, "movie");
            if (!card) continue;
            next.push({
              href: card.mediaType === "tv" ? `/tv/${card.id}` : `/movie/${card.id}`,
              title: card.title,
              meta: card.date?.slice(0, 4) || (card.mediaType === "tv" ? "Series" : "Film"),
              metaEm: firstGenre(card.genreIds) ?? undefined,
              image: imageUrl(card.posterPath, "w185"),
              group: card.mediaType === "tv" ? "Television" : "Films",
            });
          }
          const limits = { Films: 5, Television: 3, People: 3 } as const;
          const counts = { Films: 0, Television: 0, People: 0 };
          setSuggestions(next.filter((item) => counts[item.group]++ < limits[item.group]));
          setStamp(trimmed);
          setActive(-1);
        } catch (error) {
          if (error instanceof CatalogueError && error.code === "unconfigured") {
            const needle = trimmed.toLowerCase();
            setSuggestions(
              previewCards()
                .filter((card) => card.title.toLowerCase().includes(needle))
                .map((card) => ({
                  href: card.mediaType === "tv" ? `/tv/${card.id}` : `/movie/${card.id}`,
                  title: card.title,
                  meta: card.mediaType === "tv" ? "Series" : "Film",
                  image: card.posterPath,
                  group: card.mediaType === "tv" ? "Television" as const : "Films" as const,
                })),
            );
          } else {
            setSuggestions([]);
          }
          setStamp(trimmed);
        }
      })();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (search) inputRef.current?.focus();
  }, [search]);

  const trimmed = query.trim();
  const visible = trimmed.length >= 2 && stamp === trimmed ? suggestions : [];
  const searching = trimmed.length >= 2 && stamp !== trimmed;
  const moodOffer = looksLikeMood(
    trimmed,
    visible.map((item) => item.title),
  );
  const picks: SearchPick[] = [];
  if (moodOffer) picks.push({ kind: "mood", query: trimmed });
  for (const item of visible) picks.push({ kind: "title", href: item.href });
  const titleOffset = moodOffer ? 1 : 0;

  function go(href: string) {
    setSearch(false);
    setMenu(false);
    setQuery("");
    router.push(href);
  }

  function openPick(pick: SearchPick) {
    switch (pick.kind) {
      case "mood":
        go(moodSearchHref(pick.query));
        return;
      case "title":
        go(pick.href);
        return;
      default: {
        const unexpected: never = pick;
        return unexpected;
      }
    }
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearch(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, picks.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, -1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const pick = active >= 0 ? picks[active] : undefined;
      if (pick) openPick(pick);
      else if (trimmed) go(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const header = (stickyBar: boolean) => (
    <header className={stickyBar ? "hdr hdr--sticky is-shown" : light ? "hdr hdr--light" : "hdr"} data-variant={light && !stickyBar ? "light" : "dark"}>
      <Link href="/" className="hdr-brand" aria-label="Moodcut home">
        <span className="hdr-mark">M</span>
        <span className="hdr-word">Moodcut</span>
      </Link>
      <div className="hdr-right">
        <nav className="hdr-links" aria-label="Primary">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hdr-link" aria-current={path === link.href ? "page" : undefined}>
              {link.em ? <em>{link.label}</em> : link.label}
            </Link>
          ))}
        </nav>
        <div className="hdr-icons">
          <button className="hdr-icon" type="button" aria-label="Search" onClick={() => { setSearch(true); setMenu(false); setAccount(false); setSavedOpen(false); }}>
            <SearchIcon />
          </button>
          <div className="relative">
            <button className="hdr-icon" type="button" aria-label="Watchlist" aria-expanded={savedOpen} onClick={() => { setSavedOpen((open) => !open); setAccount(false); }}>
              <BookmarkIcon />
              {items.length > 0 ? <span className="hdr-badge">{items.length}</span> : null}
            </button>
            {savedOpen ? (
              <div className="dd" role="menu">
                <p className="dd-title">Saved</p>
                {items.length === 0 ? <p className="text-sm italic">Nothing saved yet.</p> : items.slice(0, 4).map((item) => (
                  <Link key={`${item.mediaType}-${item.id}`} href={item.mediaType === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`} className="dd-item" onClick={() => setSavedOpen(false)}>
                    {item.backdropPath ? <Image src={imageUrl(item.backdropPath, "w185") ?? ""} alt="" width={56} height={32} className="h-8 w-14 object-cover" /> : <span className="h-8 w-14 bg-neutral-100" />}
                    <span>{item.title}</span>
                  </Link>
                ))}
                <Link className="dd-link" href="/saved" onClick={() => setSavedOpen(false)}>View list</Link>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <button className="hdr-icon" type="button" aria-label="Account" aria-expanded={account} onClick={() => { setAccount((open) => !open); setSavedOpen(false); }}>
              <UserIcon />
            </button>
            {account ? (
              <div className="dd" role="menu">
                <p className="dd-title">My Moodcut</p>
                <Link className="dd-link" href="/saved" onClick={() => setAccount(false)}>Saved</Link>
                <Link className="dd-link" href="/recent" onClick={() => setAccount(false)}>Recently viewed</Link>
                <Link className="dd-link" href="/spike" onClick={() => setAccount(false)}>On-device check</Link>
                <Link className="dd-link" href="/#mood" onClick={() => setAccount(false)}>Mood search</Link>
              </div>
            ) : null}
          </div>
          <button className="hdr-icon" type="button" aria-label="Menu" aria-expanded={menu} onClick={() => { setMenu(true); setSearch(false); }}>
            <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <>
      {header(false)}
      {sticky ? header(true) : null}
      {menu || search ? <button className="drawer-scrim" aria-label="Close panel" onClick={() => { setMenu(false); setSearch(false); }} /> : null}
      {menu ? (
        <aside className="drawer drawer--menu on-dark" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex justify-end px-4">
            <button className="hdr-icon" type="button" aria-label="Close menu" onClick={() => setMenu(false)}><CloseIcon /></button>
          </div>
          <nav className="menu-body">
            <div className="menu-sec">
              <h2 className="menu-h">Browse the Films</h2>
              <Link className="menu-link" href="/" onClick={() => setMenu(false)}>Home</Link>
              <Link className="menu-link" href="/#mood" onClick={() => setMenu(false)}>Mood search</Link>
              <Link className="menu-link" href="/browse/all" onClick={() => setMenu(false)}>All films</Link>
              <Link className="menu-link" href="/browse/now-playing" onClick={() => setMenu(false)}>In theaters</Link>
              <Link className="menu-link" href="/browse/upcoming" onClick={() => setMenu(false)}>Coming soon</Link>
              <Link className="menu-link" href="/browse/top-rated" onClick={() => setMenu(false)}>Top rated</Link>
            </div>
            <div className="menu-sec">
              <h2 className="menu-h"><em>Trending</em></h2>
              <Link className="menu-link" href="/browse/trending" onClick={() => setMenu(false)}>Trending today</Link>
              <Link className="menu-link" href="/browse/all?status=released" onClick={() => setMenu(false)}>Available now</Link>
              <Link className="menu-link" href="/browse/all?status=upcoming" onClick={() => setMenu(false)}>Upcoming / unreleased</Link>
            </div>
            <div className="menu-sec">
              <h2 className="menu-h">Genres</h2>
              {GENRES.map(([id, name]) => (
                <Link key={id} className="menu-link" href={`/browse/all?genre=${encodeURIComponent(id)}`} onClick={() => setMenu(false)}>{name}</Link>
              ))}
            </div>
            <div className="menu-sec">
              <h2 className="menu-h">Television</h2>
              <Link className="menu-link" href="/browse/tv" onClick={() => setMenu(false)}>Popular series</Link>
              <Link className="menu-link" href="/browse/tv-top" onClick={() => setMenu(false)}>Top rated series</Link>
            </div>
          </nav>
        </aside>
      ) : null}
      {search ? (
        <aside className="drawer drawer--search" role="dialog" aria-modal="true" aria-label="Search">
          <div className="search-close">
            <button className="hdr-icon" type="button" aria-label="Close search" onClick={() => setSearch(false)}><CloseIcon /></button>
          </div>
          <div className="search-body">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (trimmed) go(`/search?q=${encodeURIComponent(trimmed)}`);
              }}
            >
              <label className="s-label" htmlFor="search-input">Search</label>
              <div className="s-field">
                <SearchIcon />
                <input
                  id="search-input"
                  ref={inputRef}
                  className="s-input"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(-1);
                  }}
                  onKeyDown={onKey}
                  placeholder="Search"
                  role="combobox"
                  aria-expanded={picks.length > 0}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
                />
                <button className="s-submit" type="submit" aria-label="Show all results"><ArrowIcon /></button>
              </div>
              <p className="s-hint">
                A feeling can use Search by mood, or the field on the <button type="button" onClick={() => go("/#mood")}>home page</button>.
              </p>
            </form>
            <div id={listId} className="sugg" role="listbox" aria-label="Search suggestions">
              {moodOffer ? (
                <button
                  id={`${listId}-opt-0`}
                  type="button"
                  role="option"
                  aria-selected={active === 0}
                  className={active === 0 ? "sugg-item sugg-mood is-active" : "sugg-item sugg-mood"}
                  onClick={() => go(moodSearchHref(trimmed))}
                >
                  <MoodIcon />
                  <span className="sugg-mood-copy">{`Search by mood: "${trimmed}"`}</span>
                </button>
              ) : null}
              {searching ? <p className="sugg-meta">Searching…</p> : null}
              {!searching && trimmed.length >= 2 && visible.length === 0 ? (
                <p className="sugg-meta">{moodOffer ? "No title matches yet." : "No matches yet."}</p>
              ) : null}
              {(["Films", "Television", "People"] as const).map((group) => {
                const rows = visible.filter((item) => item.group === group);
                if (rows.length === 0) return null;
                return (
                  <div key={group} className="sugg-group">
                    <p className="sugg-glabel">{group}</p>
                    {rows.map((item) => {
                      const index = visible.indexOf(item) + titleOffset;
                      return (
                        <button
                          key={item.href}
                          id={`${listId}-opt-${index}`}
                          type="button"
                          role="option"
                          aria-selected={index === active}
                          className={index === active ? "sugg-item is-active" : "sugg-item"}
                          onClick={() => go(item.href)}
                        >
                          {item.image ? (
                            <Image src={item.image} alt="" width={40} height={56} className={item.round ? "sugg-thumb round" : "sugg-thumb"} />
                          ) : <span className={item.round ? "sugg-thumb round" : "sugg-thumb"} />}
                          <span className="sugg-title">{highlight(item.title, trimmed)}</span>
                          <span className="sugg-meta">
                            {item.meta}
                            {item.metaEm ? <>, <em>{item.metaEm}</em></> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {trimmed.length >= 2 ? (
                <button type="button" className="sugg-all" onClick={() => go(`/search?q=${encodeURIComponent(trimmed)}`)}>See all results for “{trimmed}” →</button>
              ) : null}
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}

function highlight(title: string, query: string) {
  const tokens = query.toLowerCase().split(/\s+/).filter((token) => token.length > 1);
  if (tokens.length === 0) return title;
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "ig");
  const parts = title.split(pattern);
  return parts.map((part, index) =>
    tokens.some((token) => part.toLowerCase() === token) ? <mark key={`${part}-${index}`}>{part}</mark> : <span key={`${part}-${index}`}>{part}</span>,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function MoodIcon() {
  return (
    <svg className="sugg-mood-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 10.2h.01M15 10.2h.01" strokeLinecap="round" />
      <path d="M8.5 13.6c.8 1.15 1.95 1.7 3.5 1.7s2.7-.55 3.5-1.7" />
    </svg>
  );
}
function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>;
}
function BookmarkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M7 4.5h10v15l-5-3.2-5 3.2z" /></svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="12" cy="8" r="3.2" /><path d="M5 20c.7-3.5 3.3-5 7-5s6.3 1.5 7 5" /></svg>;
}
function MenuIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}
function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 5l14 14M19 5 5 19" /></svg>;
}
function ArrowIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
