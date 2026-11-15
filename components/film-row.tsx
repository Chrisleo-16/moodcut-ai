"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";

import { Still } from "@/components/still";
import { firstGenre, hrefFor, statusChip, yearOf } from "@/lib/media";
import type { FilmRowLayout, MediaCard } from "@/lib/types";

export function ScrollRow({
  title,
  href,
  children,
  sectionRef,
}: {
  title: string;
  href?: string;
  children: ReactNode;
  sectionRef?: Ref<HTMLElement>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    const { scrollLeft, scrollWidth, clientWidth } = node;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState, children]);

  function scroll(direction: -1 | 1) {
    const node = scroller.current;
    if (!node) return;
    const card = node.firstElementChild as HTMLElement | null;
    const step = (card?.getBoundingClientRect().width ?? 320) + 4;
    node.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  const headingId = `row-${title.replace(/\s+/g, "-")}`;

  return (
    <section ref={sectionRef} className="sec" aria-labelledby={headingId}>
      <div className="sec-head">
        <h2 id={headingId} className="display sec-title">
          {title}
        </h2>
        <div className="sec-arrows flex">
          <button type="button" className="arrow-btn" aria-label={`Previous ${title}`} onClick={() => scroll(-1)} disabled={!canScrollLeft}>
            <span>‹</span>
          </button>
          <button type="button" className="arrow-btn" aria-label={`Next ${title}`} onClick={() => scroll(1)} disabled={!canScrollRight}>
            <span>›</span>
          </button>
        </div>
        {href ? (
          <Link href={href} className="sec-link">
            View all <i className="grid h-5 w-5 place-items-center rounded-full bg-black text-white not-italic">›</i>
          </Link>
        ) : null}
      </div>

      <div className="row-scroller" ref={scroller} onScroll={updateScrollState}>
        {children}
      </div>
    </section>
  );
}

export function FilmRow({
  title,
  href,
  items,
  todayIso,
  layout = "regular",
  showScore = false,
  rise = false,
  sectionRef,
}: {
  title: string;
  href?: string;
  items: MediaCard[];
  todayIso: string;
  layout?: FilmRowLayout;
  showScore?: boolean;
  rise?: boolean;
  sectionRef?: Ref<HTMLElement>;
}) {
  const today = new Date(`${todayIso}T00:00:00`);
  if (items.length === 0) return null;
  const cardClass = layout === "feature" ? "film-card feature" : layout === "wide" ? "film-card wide" : "film-card";
  const imageSize = layout === "feature" ? "original" : "w780";
  const sizes =
    layout === "feature" ? "(max-width: 767px) 88vw, 100vw" : layout === "wide" ? "(max-width: 767px) 78vw, 50vw" : "(max-width: 767px) 78vw, 25vw";

  return (
    <ScrollRow title={title} href={href} sectionRef={sectionRef}>
      {items.map((item, index) => {
        const chip = statusChip(item, today) ?? (item.mediaType === "tv" ? "SERIES" : null);
        const meta = [yearOf(item.date), firstGenre(item.genreIds)].filter(Boolean).join(" · ");
        const motion: CSSProperties | undefined = rise ? { animationDelay: `${index * 100}ms` } : undefined;
        return (
          <Link
            key={`${item.mediaType}-${item.id}`}
            href={hrefFor(item)}
            data-card
            className={rise ? `${cardClass} mood-rise` : cardClass}
            style={motion}
            aria-label={item.title}
          >
            <div className="film-still">
              <Still
                path={item.backdropPath ?? item.posterPath}
                size={imageSize}
                sizes={sizes}
                alt=""
                className="h-full w-full object-cover"
              />
              {chip ? <span className="film-chip">{chip}</span> : null}
              {layout === "feature" ? <span className="display film-overlay">{item.title}</span> : null}
            </div>
            {layout === "feature" ? null : (
              <>
                <div className="film-title">
                  <span>{item.title}</span>
                  {showScore && item.voteAverage ? <span className="vote-pill">{item.voteAverage.toFixed(1)}</span> : null}
                </div>
                {meta ? <p className="film-sub">{meta}</p> : null}
              </>
            )}
          </Link>
        );
      })}
    </ScrollRow>
  );
}

export function FilmGrid({ items, todayIso }: { items: MediaCard[]; todayIso: string }) {
  const today = new Date(`${todayIso}T00:00:00`);
  return (
    <div className="grid-films">
      {items.map((item) => {
        const chip = statusChip(item, today);
        const meta = [yearOf(item.date), firstGenre(item.genreIds)].filter(Boolean).join(" · ");
        return (
          <Link key={`${item.mediaType}-${item.id}`} href={hrefFor(item)} className="film-card" aria-label={item.title}>
            <div className="film-still">
              <Still path={item.backdropPath ?? item.posterPath} size="w780" alt="" className="h-full w-full object-cover" />
              {chip ? <span className="film-chip">{chip}</span> : null}
            </div>
            <div className="film-title">
              <span>{item.title}</span>
              {item.voteAverage ? <span className="vote-pill">{item.voteAverage.toFixed(1)}</span> : null}
            </div>
            {meta ? <p className="film-sub">{meta}</p> : null}
          </Link>
        );
      })}
    </div>
  );
}
