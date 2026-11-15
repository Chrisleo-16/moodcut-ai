"use client";

import { useState } from "react";

import { Still } from "@/components/still";

export function Newsletter({ image }: { image: string | null }) {
  const [note, setNote] = useState("");
  return (
    <section className="nl" aria-label="Newsletter">
      {image ? <Still path={image} size="w1280" alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
      <div className="nl-in">
        <p className="display nl-word">
          <span className="ol">Moodcut</span> Newsletter
        </p>
        <form
          className="nl-form"
          onSubmit={(event) => {
            event.preventDefault();
            setNote("Demo only. Moodcut does not collect, send, or store email addresses.");
          }}
        >
          <label className="sr-only" htmlFor="nl-email">
            Email address
          </label>
          <input id="nl-email" type="email" autoComplete="off" placeholder="Newsletter coming later (demo only)" />
          <button type="submit" aria-label="Submit email">
            →
          </button>
        </form>
        <p className="nl-note" aria-live="polite">{note}</p>
      </div>
    </section>
  );
}
