"use client";

import { ProgressBar } from "@heroui/react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { FilmRow } from "@/components/film-row";
import { CatalogueError, fetchCatalogue } from "@/lib/client-api";
import { firebaseSetupIssue } from "@/lib/firebase-config";
import {
  askMood,
  downloadOnDeviceModel,
  inferenceBadge,
  isQuotaError,
  QUOTA_MESSAGE,
  type MoodTrace,
} from "@/lib/firebase-ai";
import { toCard } from "@/lib/media";
import { discoverQuery, examplePlan, moodSummary, previewForPlan, type MoodPlan } from "@/lib/mood-plan";
import type { MediaCard, TmdbPaged } from "@/lib/types";

type MoodResult = {
  plan: MoodPlan;
  badge: string;
  note: string;
  items: MediaCard[];
};

type StepId = "read" | "infer" | "genres" | "films";
type StepState = "pending" | "active" | "done" | "failed";

type MoodStep = {
  id: StepId;
  label: string;
  state: StepState;
  detail?: string;
};

const PLACEHOLDERS = ["Exhausted but fun", "Need a good cry", "Rainy Sunday, a bit sad"] as const;

const MOOD_CHIPS = [
  "Exhausted but fun",
  "Need a good cry",
  "Rainy Sunday, a bit sad",
  "Something thrilling",
  "Quiet and strange",
  "Warm and comforting",
] as const;

const STEP_HOLD_MS = 560;
const SUMMARY_LEAD_MS = 400;
const PLACEHOLDER_MS = 3200;

const START_STEPS: MoodStep[] = [
  { id: "read", label: "Reading your mood", state: "pending" },
  { id: "infer", label: "Asking the model", state: "pending" },
  { id: "genres", label: "Turning your mood into genres", state: "pending" },
  { id: "films", label: "Finding films on TMDB", state: "pending" },
];

type Fact = {
  id: StepId;
  label: string;
  ready: boolean;
  error?: string;
};

type Board = {
  steps: Fact[];
  result: MoodResult | null;
};

export function MoodSearch({ todayIso, initialQuery = "" }: { todayIso: string; initialQuery?: string }) {
  const setupIssue = firebaseSetupIssue();
  const railRef = useRef<HTMLElement>(null);
  const launched = useRef("");
  const [mood, setMood] = useState(initialQuery);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<MoodResult | null>(null);
  const [steps, setSteps] = useState<MoodStep[] | null>(null);
  const [details, setDetails] = useState(false);
  const [riseKey, setRiseKey] = useState(0);
  const [revealCard, setRevealCard] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [live, setLive] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    return () => {
      runId.current += 1;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion || fieldFocused || mood.trim().length > 0) return;
    const timer = window.setInterval(() => {
      setExampleIndex((current) => (current + 1) % PLACEHOLDERS.length);
    }, PLACEHOLDER_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion, fieldFocused, mood]);

  useEffect(() => {
    if (riseKey === 0) return;
    const node = railRef.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [riseKey, result]);

  async function onDownload() {
    if (setupIssue) {
      setMessage(setupIssue);
      return;
    }
    setMessage("");
    setProgress(0);
    try {
      await downloadOnDeviceModel((fraction) => setProgress(Math.round(fraction * 100)));
      setProgress(100);
      setMessage("On-device model is ready.");
    } catch (error) {
      setMessage(isQuotaError(error) ? QUOTA_MESSAGE : error instanceof Error ? error.message : "The download did not finish.");
    }
  }

  const runSearch = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (text.length < 2) {
      setMessage("Describe a mood in a few words.");
      return;
    }
    setMood(text);
    const id = runId.current + 1;
    runId.current = id;
    const alive = () => runId.current === id;
    setBusy(true);
    setMessage("");
    setDetails(false);
    setResult(null);
    setRevealCard(false);
    setShowCards(false);
    const board = freshBoard();
    setSteps(frame(board, 0));
    setLive(board.steps[0]?.label ?? "Reading your mood");

    const work = settle(board, text, setupIssue, (fraction) => setProgress(Math.round(fraction * 100)));
    try {
      await present(board, alive, {
        setSteps,
        setLive,
        reveal: async (next) => {
          if (!alive()) return;
          setResult(next);
          setRevealCard(true);
          setLive(`${moodSummary(next.plan)} ${sourceWords(next.badge)}.`);
          await wait(SUMMARY_LEAD_MS);
          if (!alive()) return;
          setShowCards(true);
          setRiseKey((value) => value + 1);
        },
      });
    } finally {
      await work.catch(() => undefined);
      if (alive()) setBusy(false);
    }
  }, [setupIssue]);

  useEffect(() => {
    const text = initialQuery.trim();
    if (text.length < 2) return;
    if (launched.current === text) return;
    launched.current = text;
    void runSearch(text);
  }, [initialQuery, runSearch]);

  function onChipKeys(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button.mood-chip"));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0 || buttons.length === 0) return;
    event.preventDefault();
    let next = current;
    if (key === "ArrowRight" || key === "ArrowDown") next = (current + 1) % buttons.length;
    else if (key === "ArrowLeft" || key === "ArrowUp") next = (current - 1 + buttons.length) % buttons.length;
    else if (key === "Home") next = 0;
    else next = buttons.length - 1;
    buttons[next]?.focus();
  }

  const placeholder = PLACEHOLDERS[exampleIndex] ?? PLACEHOLDERS[0];
  const filmsActive = steps?.some((step) => step.id === "films" && step.state === "active") ?? false;

  return (
    <section id="mood" className="mood-hero" aria-labelledby="mood-heading" aria-busy={busy}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {live}
      </p>
      <div className="mood-hero-cluster">
        <h1 id="mood-heading" className="display mood-hero-title">
          How do you feel tonight?
        </h1>
        <form
          className="mood-form"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch(mood);
          }}
        >
          <div className={mood.trim().length > 0 ? "mood-field has-value" : "mood-field"}>
            <span className="mood-caret" aria-hidden="true" />
            <input
              id="mood-input"
              className="mood-input"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              onFocus={() => setFieldFocused(true)}
              onBlur={() => setFieldFocused(false)}
              placeholder={placeholder}
              aria-labelledby="mood-heading"
              aria-describedby="mood-hybrid mood-examples"
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
          <p id="mood-hybrid" className="mood-hybrid">
            Runs on your device with Gemini Nano when Chrome supports it, otherwise in the cloud.
          </p>
          <p id="mood-examples" className="sr-only">
            Examples include Exhausted but fun, Need a good cry, and Rainy Sunday, a bit sad. Choose a chip or type your own mood.
          </p>
          <div className="mood-chips" role="group" aria-label="Mood examples" onKeyDown={onChipKeys}>
            {MOOD_CHIPS.map((chip) => (
              <button key={chip} type="button" className="mood-chip" onClick={() => void runSearch(chip)} disabled={busy}>
                {chip}
              </button>
            ))}
          </div>
          <div className="mood-actions">
            <button className="mood-find" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? "Finding" : "Find films"}
            </button>
            <button className="mood-download" type="button" onClick={() => void onDownload()} disabled={busy}>
              Download on-device model
            </button>
          </div>
        </form>
        {progress !== null ? (
          <ProgressBar aria-label="On-device model download" value={progress} minValue={0} maxValue={100}>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
            <ProgressBar.Output />
          </ProgressBar>
        ) : null}
        {message ? <p className="mood-message">{message}</p> : null}
        <div className="mood-results">
          {steps ? <MoodSteps steps={steps} onRetry={() => void runSearch(mood)} retryDisabled={busy} /> : null}
          {result ? (
            <MoodSummary
              result={result}
              open={details}
              reveal={revealCard}
              onToggle={() => setDetails((value) => !value)}
            />
          ) : null}
        </div>
      </div>
      {filmsActive ? <MoodSkeleton /> : null}
      {showCards && result && result.items.length > 0 ? (
        <FilmRow
          key={riseKey}
          title="For this mood"
          items={result.items}
          todayIso={todayIso}
          layout="regular"
          rise={riseKey > 0}
          sectionRef={railRef}
        />
      ) : null}
    </section>
  );
}

function MoodSteps({ steps, onRetry, retryDisabled }: { steps: MoodStep[]; onRetry: () => void; retryDisabled: boolean }) {
  return (
    <ol className="mood-steps">
      {steps.map((step) => (
        <li key={step.id} className={`mood-step is-${step.state}`}>
          <span className="mood-mark" aria-hidden>
            {step.state === "done" ? <CheckIcon /> : step.state === "failed" ? <CrossIcon /> : step.state === "active" ? <span className="mood-spin" /> : null}
          </span>
          <span className="mood-step-copy">
            <span>{step.label}</span>
            {step.state === "failed" && step.detail ? <span className="mood-fail">{step.detail}</span> : null}
            {step.state === "failed" ? (
              <button type="button" className="mood-retry" onClick={onRetry} disabled={retryDisabled}>
                Try again
              </button>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function MoodSummary({
  result,
  open,
  reveal,
  onToggle,
}: {
  result: MoodResult;
  open: boolean;
  reveal: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={reveal ? "mood-card mood-fade" : "mood-card"}>
      <p>{moodSummary(result.plan)}</p>
      <span className={`mood-source is-${result.badge.toLowerCase()}`}>{sourceWords(result.badge)}</span>
      {result.note ? <p className="mood-note">{result.note}</p> : null}
      <button type="button" className="mood-toggle" aria-expanded={open} onClick={onToggle}>
        {open ? "Hide details" : "Show details"}
      </button>
      {open ? <pre className="mood-json">{JSON.stringify(result.plan, null, 2)}</pre> : null}
    </div>
  );
}

function MoodSkeleton() {
  return (
    <section className="sec" aria-hidden>
      <div className="sec-head">
        <h2 className="display sec-title">For this mood</h2>
      </div>
      <div className="row-scroller">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <div key={key} className="film-card">
            <div className="film-still mood-skel" />
            <div className="mood-skel-line" />
          </div>
        ))}
      </div>
    </section>
  );
}

function localExample(mood: string): MoodResult {
  const plan = examplePlan(mood);
  return {
    plan,
    badge: "EXAMPLE",
    note: "Firebase is not configured, so this filter is a local example rather than a model result.",
    items: previewForPlan(plan),
  };
}

function freshBoard(): Board {
  return {
    steps: START_STEPS.map((step) => ({ id: step.id, label: step.label, ready: false })),
    result: null,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function frame(board: Board, cursor: number): MoodStep[] {
  return board.steps.map((step, index) => {
    if (step.error && index === cursor) return { id: step.id, label: step.label, state: "failed", detail: step.error };
    if (index < cursor || (index === cursor && step.ready && step.error)) {
      return { id: step.id, label: step.label, state: step.error ? "failed" : "done", detail: step.error };
    }
    if (index === cursor) return { id: step.id, label: step.label, state: "active" };
    return { id: step.id, label: step.label, state: "pending" };
  });
}

async function present(
  board: Board,
  alive: () => boolean,
  hooks: {
    setSteps: (steps: MoodStep[]) => void;
    setLive: (text: string) => void;
    reveal: (result: MoodResult) => Promise<void>;
  },
) {
  const announced = { text: "" };
  let painted = "";
  const draw = (cursor: number) => {
    const next = frame(board, cursor);
    const signature = next.map((step) => `${step.id}:${step.state}:${step.label}:${step.detail ?? ""}`).join("|");
    if (signature !== painted) {
      painted = signature;
      hooks.setSteps(next);
    }
    const current = next[cursor];
    const text = current?.state === "failed" ? current.detail ?? current.label : current?.label ?? "";
    if (text && text !== announced.text) {
      announced.text = text;
      hooks.setLive(text);
    }
  };
  for (let cursor = 0; cursor < board.steps.length; cursor += 1) {
    const started = performance.now();
    while (alive()) {
      const step = board.steps[cursor];
      draw(cursor);
      if (step?.error) return;
      if (step?.ready && performance.now() - started >= STEP_HOLD_MS) break;
      await wait(40);
    }
    if (!alive()) return;
  }
  draw(board.steps.length);
  const result = board.result;
  if (!alive() || !result) return;
  await hooks.reveal(result);
}

function note(board: Board, event: MoodTrace) {
  const read = board.steps.find((step) => step.id === "read");
  const infer = board.steps.find((step) => step.id === "infer");
  const genres = board.steps.find((step) => step.id === "genres");
  switch (event.type) {
    case "read":
      return;
    case "infer":
      if (read) read.ready = true;
      if (infer) infer.label = inferLabel(event.where);
      return;
    case "inferred":
      if (infer) {
        infer.ready = true;
        infer.label = inferLabel(event.where);
      }
      return;
    case "genres":
      if (genres) genres.ready = true;
      return;
    default: {
      const unexpected: never = event;
      return unexpected;
    }
  }
}

function failOpen(board: Board, message: string) {
  const step = board.steps.find((item) => !item.ready);
  if (step) step.error = message;
  else {
    const last = board.steps[board.steps.length - 1];
    if (last) last.error = message;
  }
}

async function settle(board: Board, text: string, local: string | null, onProgress: (fraction: number) => void) {
  if (local) {
    const example = localExample(text);
    board.steps = [
      { id: "read", label: "Reading your mood", ready: true },
      { id: "infer", label: "Using a local example", ready: true },
      { id: "genres", label: "Turning your mood into genres", ready: true },
      { id: "films", label: "Showing preview titles", ready: true },
    ];
    board.result = example;
    return;
  }
  try {
    const answer = await askMood(text, onProgress, (event) => note(board, event));
    const loaded = await titlesFor(answer.plan);
    const films = board.steps.find((step) => step.id === "films");
    const genres = board.steps.find((step) => step.id === "genres");
    if (genres) genres.ready = true;
    if (films) {
      films.label = loaded.preview ? "Showing preview titles" : "Finding films on TMDB";
      films.ready = true;
    }
    board.result = {
      plan: answer.plan,
      badge: inferenceBadge(answer.source),
      note: answer.fellBack ? "This list used the cloud model." : "",
      items: loaded.items,
    };
  } catch (error) {
    if (error instanceof CatalogueError && error.code === "unconfigured") {
      const plan = examplePlan(text);
      const films = board.steps.find((step) => step.id === "films");
      const genres = board.steps.find((step) => step.id === "genres");
      if (genres) genres.ready = true;
      if (films) {
        films.label = "Showing preview titles";
        films.ready = true;
      }
      board.result = { plan, badge: "EXAMPLE", note: "Preview titles for this filter.", items: previewForPlan(plan) };
      return;
    }
    const detail = isQuotaError(error) ? QUOTA_MESSAGE : error instanceof Error ? error.message : "Mood search did not finish. Try again in a moment.";
    failOpen(board, detail);
  }
}

function inferLabel(where: "device" | "cloud" | "unknown"): string {
  switch (where) {
    case "device":
      return "Thinking on your device";
    case "cloud":
      return "Asking the cloud model";
    case "unknown":
      return "Asking the model";
    default: {
      const unexpected: never = where;
      return unexpected;
    }
  }
}

function sourceWords(badge: string): string {
  switch (badge) {
    case "ON_DEVICE":
      return "On your device";
    case "IN_CLOUD":
      return "In the cloud";
    case "EXAMPLE":
      return "Example";
    case "UNKNOWN":
      return "Source unknown";
    default:
      return "Source unknown";
  }
}

async function titlesFor(plan: MoodPlan): Promise<{ items: MediaCard[]; preview: boolean }> {
  const kinds: ("movie" | "tv")[] = plan.mediaType === "any" ? ["movie", "tv"] : [plan.mediaType];
  try {
    const batches = await Promise.all(
      kinds.map(async (kind) => {
        const params = discoverQuery(plan, kind);
        if (!params) return [];
        const data = await fetchCatalogue<TmdbPaged>(`/discover/${kind}`, params);
        return (data.results ?? []).map((item) => toCard(item, kind)).filter((item): item is MediaCard => item !== null);
      }),
    );
    const items = batches.flat().filter((item) => item.backdropPath).slice(0, 16);
    if (items.length > 0) return { items, preview: false };
    return { items: previewForPlan(plan), preview: true };
  } catch (error) {
    if (error instanceof CatalogueError && error.code === "unconfigured") return { items: previewForPlan(plan), preview: true };
    throw error;
  }
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 6.2 4.6 9 10 3" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l6 6M9 3 3 9" />
    </svg>
  );
}
