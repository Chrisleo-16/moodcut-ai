import Image from "next/image";
import Link from "next/link";

const COLUMNS = [
  {
    title: "Films",
    links: [
      { href: "/browse/now-playing", label: "In Theaters" },
      { href: "/browse/upcoming", label: "Coming Soon" },
      { href: "/browse/top-rated", label: "Top Rated" },
      { href: "/browse/trending", label: "Trending" },
    ],
  },
  {
    title: "Television",
    links: [
      { href: "/browse/tv", label: "Popular" },
      { href: "/browse/tv-top", label: "Top Rated" },
    ],
  },
  {
    title: "Moodcut",
    links: [
      { href: "/", label: "Home" },
      { href: "/#mood", label: "Mood search" },
      { href: "/saved", label: "Saved" },
      { href: "/spike", label: "On-device check" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="ft">
      <div className="ft-cols">
        {COLUMNS.map((column) => (
          <div key={column.title} className="ft-box">
            <h2 className="ft-h">{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="ft-box">
          <a className="display text-4xl" href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
            TMDB
          </a>
          <p>
            This product uses the TMDB API but is not endorsed or certified by TMDB. Film, series, and people data and
            images are provided by{" "}
            <a className="underline" href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
              The Movie Database (TMDB)
            </a>
            .
          </p>
        </div>
      </div>
      <div className="ft-word" aria-hidden>
        <span className="ft-letter">M</span>
        <span className="ft-counter">
          <Image src="/preview/salt-line.svg" alt="" width={320} height={320} unoptimized className="h-full w-full object-cover" />
        </span>
        <span className="ft-letter">ODCUT</span>
      </div>
      <div className="ft-legal">
        <span>Official trailers from YouTube. Film and TV data from TMDB. Moodcut does not stream films or series.</span>
        <span>Moodcut</span>
      </div>
    </footer>
  );
}
