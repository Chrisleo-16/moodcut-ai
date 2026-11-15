"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTrailer } from "@/components/trailer-provider";
import { useWatchlist } from "@/components/watchlist";
import { hrefFor, imageUrl, statusChip, yearOf } from "@/lib/media";
import type { MediaCard } from "@/lib/types";

export function HeroCarousel({
  items,
  todayIso,
  trailers,
  single = false,
  tagline,
}: {
  items: MediaCard[];
  todayIso: string;
  trailers: Record<string, string | null>;
  single?: boolean;
  tagline?: string;
}) {
  const [index, setIndex] = useState(0);
  const [limit, setLimit] = useState(items.length);
  const [isPaused, setIsPaused] = useState(false);
  const today = new Date(`${todayIso}T00:00:00`);
  const slides = items.slice(0, single ? 1 : limit);
  const count = slides.length;

  const pointerStartRef = useRef<{ x: number; y: number; isDrag: boolean }>({ x: 0, y: 0, isDrag: false });
  const wheelCooldownRef = useRef<number>(0);

  const goPrev = useCallback(() => {
    if (count < 2) return;
    setIndex((current) => (current - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count < 2) return;
    setIndex((current) => (current + 1) % count);
  }, [count]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setLimit(media.matches ? 7 : 10);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  // Auto-advance timer: restarts on index change, pauses on hover / touch.
  useEffect(() => {
    if (single || count < 2 || isPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), 6500);
    return () => window.clearInterval(timer);
  }, [count, single, isPaused, index]);

  // Touch swipe (phones / tablets)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (single) return;
    const t = e.touches[0];
    pointerStartRef.current = { x: t.clientX, y: t.clientY, isDrag: true };
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (single) return;
    setIsPaused(false);
    if (!pointerStartRef.current.isDrag) return;
    pointerStartRef.current.isDrag = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - pointerStartRef.current.x;
    const dy = t.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  // Mouse drag (laptop / desktop)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (single || e.pointerType === "touch" || e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, [role='button'], [role='tab']")) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, isDrag: true };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (single || e.pointerType === "touch") return;
    if (!pointerStartRef.current.isDrag) return;
    pointerStartRef.current.isDrag = false;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  // Trackpad horizontal swipe
  const handleWheel = (e: React.WheelEvent) => {
    if (single || count < 2) return;
    if (Math.abs(e.deltaX) > 35 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const now = Date.now();
      if (now - wheelCooldownRef.current > 400) {
        wheelCooldownRef.current = now;
        if (e.deltaX > 0) goNext();
        else goPrev();
      }
    }
  };

  // Keyboard navigation when the carousel is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (single) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  };

  if (count === 0) return <section className="hero" />;

  return (
    <section
      className={single ? "hero hero--detail on-dark" : "hero on-dark select-none"}
      aria-roledescription={single ? undefined : "carousel"}
      aria-label="Featured"
      tabIndex={single ? undefined : 0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((item, itemIndex) => {
        const active = itemIndex === index;
        const trailer = trailers[`${item.mediaType}:${item.id}`] ?? null;
        const chip = single ? statusChip(item, today) ?? yearOf(item.date) : statusChip(item, today) ?? "TRENDING NOW";
        return (
          <article key={`${item.mediaType}-${item.id}`} className={active ? "hero-slide is-active" : "hero-slide"} aria-hidden={!active}>
            <picture>
              <source media="(max-width: 767px)" srcSet={imageUrl(item.posterPath ?? item.backdropPath, "w780") ?? ""} />
              <source media="(min-width: 1024px) and (min-resolution: 1.5dppx)" srcSet={imageUrl(item.backdropPath, "original") ?? ""} />
              <img className="hero-img pointer-events-none" src={imageUrl(item.backdropPath, "w1280") ?? ""} alt="" fetchPriority={itemIndex === 0 ? "high" : "auto"} />
            </picture>
            <div className="hero-shade pointer-events-none" />
            {active ? (
              <HeroCopy
                item={item}
                chip={chip}
                tagline={tagline}
                trailer={trailer}
                single={single}
              />
            ) : null}
            {!single ? <span className="hero-progress" /> : null}
          </article>
        );
      })}
      {!single && count > 1 ? (
        <div className="hero-dots" role="tablist" aria-label="Featured titles">
          {slides.map((item, itemIndex) => (
            <button
              key={`${item.id}-dot`}
              type="button"
              role="tab"
              className={itemIndex === index ? "hero-dot is-active" : "hero-dot"}
              aria-label={item.title}
              aria-selected={itemIndex === index}
              onClick={() => setIndex(itemIndex)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function HeroCopy({
  item,
  chip,
  tagline,
  trailer,
  single,
}: {
  item: MediaCard;
  chip: string | null;
  tagline?: string;
  trailer: string | null;
  /** True on a title page, where a Details link would point at the page itself. */
  single: boolean;
}) {
  const { openTrailer } = useTrailer();
  const { isSaved, toggle } = useWatchlist();
  const saved = isSaved(item.mediaType, item.id);
  const href = hrefFor(item);
  const tier = item.title.length > 45 ? "ht-xxl" : item.title.length > 30 ? "ht-xl" : item.title.length > 18 ? "ht-l" : "";
  return (
    <div className="hero-copy">
      {chip ? <span className="hero-chip">{chip}</span> : null}
      <h1 className={`display hero-title ${tier}`}>
        <Link href={href}>{item.title}</Link>
      </h1>
      {tagline ? <p className="hero-tagline">{tagline}</p> : null}
      <div className="hero-cta">
        {trailer ? (
          <button type="button" className="cta-fill" onClick={() => openTrailer({ youtubeKey: trailer, title: item.title })}>
            <PlayIcon />
            Watch trailer
          </button>
        ) : null}
        {!single ? (
          <Link className={trailer ? "cta-line" : "cta-fill"} href={href}>
            Details
          </Link>
        ) : null}
        <button
          type="button"
          className={saved ? "cta-save is-saved" : "cta-save"}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
          onClick={() =>
            toggle({
              id: item.id,
              mediaType: item.mediaType,
              title: item.title,
              backdropPath: item.backdropPath,
              year: yearOf(item.date),
            })
          }
        >
          <HeartIcon />
        </button>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden>
      <path d="M0 0v14l12-7z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 24 22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" />
    </svg>
  );
}
