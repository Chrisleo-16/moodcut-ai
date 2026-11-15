import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import {
  AIError,
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  Schema,
} from "firebase/ai";

import { firebaseSetupIssue, readDebugToken, readFirebaseConfig } from "@/lib/firebase-config";
import { moodPrompt, routeMoodLanguage, type OnDeviceLanguage } from "@/lib/language";
import { parseMoodPlan, type MoodPlan } from "@/lib/mood-plan";
import { MOOD_GENRE_NAMES } from "@/lib/genres";

const CLOUD_MODEL = "gemini-3.5-flash-lite";
const ENGLISH_OUTPUT = { type: "text" as const, languages: ["en"] };
const DEVICE_WAIT_MS = 18_000;
const CLOUD_WAIT_MS = 30_000;
const APP_CHECK_WAIT_MS = 12_000;
const MODEL_WAIT_MESSAGE = "The model did not answer in time. Try again in a moment.";
const APP_CHECK_MESSAGE = "The safety check did not finish. This site may not be on the allowed list yet.";
const APP_CHECK_WARN =
  "Moodcut could not get a Firebase App Check token. Add this site to the reCAPTCHA Enterprise key domains, and confirm the NEXT_PUBLIC_FIREBASE environment variables are set.";

class DeadlineError extends Error {
  constructor(readonly phase: "device" | "cloud" | "app-check") {
    super(phase);
    this.name = "DeadlineError";
  }
}

export const QUOTA_MESSAGE =
  "The cloud model is out of quota for the moment. Wait a little and try again. If Chrome has finished downloading the on-device model, another try can stay on this computer.";

type AiGlobal = typeof globalThis & {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
};

let appCheckInstance: AppCheck | undefined;

function requireBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Firebase AI Logic runs in the browser main thread only.");
  }
}

function firebaseApp(): FirebaseApp {
  requireBrowser();
  const issue = firebaseSetupIssue();
  if (issue) throw new Error(issue);
  const existing = getApps()[0];
  if (existing) return existing;
  const config = readFirebaseConfig();
  return initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket || undefined,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });
}

function ensureAppCheck(app: FirebaseApp): AppCheck {
  if (appCheckInstance) return appCheckInstance;
  const debug = readDebugToken();
  if (debug !== undefined) {
    (globalThis as AiGlobal).FIREBASE_APPCHECK_DEBUG_TOKEN = debug;
  }
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(readFirebaseConfig().appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheckInstance;
}

function warnAppCheck(): void {
  console.warn(APP_CHECK_WARN);
}

async function requireAppCheckToken(app: FirebaseApp): Promise<void> {
  const check = ensureAppCheck(app);
  try {
    const result = await withDeadline(getToken(check, false), APP_CHECK_WAIT_MS, "app-check");
    if (!result.token) {
      warnAppCheck();
      throw new Error(APP_CHECK_MESSAGE);
    }
  } catch (error) {
    if (error instanceof Error && error.message === APP_CHECK_MESSAGE) throw error;
    warnAppCheck();
    throw new Error(APP_CHECK_MESSAGE);
  }
}

function moodSchema() {
  return Schema.object({
    properties: {
      genres: Schema.array({
        description: "One to three genres from the allowed list",
        items: Schema.enumString({ enum: [...MOOD_GENRE_NAMES] }),
        minItems: 1,
        maxItems: 3,
      }),
      mediaType: Schema.enumString({
        enum: ["movie", "tv", "any"],
        description: "movie, tv, or any",
      }),
      era: Schema.enumString({
        enum: ["any", "classic", "recent", "upcoming"],
        description: "any, classic before 2000, recent from 2018, or upcoming",
      }),
      minVote: Schema.number({
        description: "Minimum audience score from 0 to 10. Use 0 if the viewer did not ask for a rating.",
      }),
    },
  });
}

function createMoodModel(mode: "device" | "cloud", language: OnDeviceLanguage) {
  const app = firebaseApp();
  ensureAppCheck(app);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const schema = moodSchema();
  return getGenerativeModel(ai, {
    mode: mode === "cloud" ? InferenceMode.ONLY_IN_CLOUD : InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 512,
      },
    },
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: [language] }],
        expectedOutputs: [ENGLISH_OUTPUT],
      },
      promptOptions: {
        responseConstraint: schema,
      },
    },
  });
}

export function isQuotaError(error: unknown): boolean {
  const status = error instanceof AIError ? error.customErrorData?.status : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof AIError ? error.code : "";
  return status === 429 || /\b429\b|quota|resource.?exhausted|rate limit/i.test(`${code} ${message}`);
}

function withDeadline<T>(work: Promise<T>, ms: number, phase: DeadlineError["phase"]): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new DeadlineError(phase)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function asSearchError(error: unknown): Error {
  if (isQuotaError(error)) return error instanceof Error ? error : new Error(QUOTA_MESSAGE);
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (/appcheck|app-check|recaptcha/i.test(`${code} ${message}`)) {
    warnAppCheck();
    return new Error(APP_CHECK_MESSAGE);
  }
  if (error instanceof Error) return error;
  return new Error("Mood search did not finish. Try again in a moment.");
}

async function generateMood<T>(work: Promise<T>, phase: "device" | "cloud"): Promise<T> {
  const ms = phase === "device" ? DEVICE_WAIT_MS : CLOUD_WAIT_MS;
  try {
    return await withDeadline(work, ms, phase);
  } catch (error) {
    if (error instanceof DeadlineError && error.phase === "device") throw error;
    if (error instanceof DeadlineError) throw new Error(MODEL_WAIT_MESSAGE);
    throw asSearchError(error);
  }
}

export function inferenceBadge(source: string | undefined): "ON_DEVICE" | "IN_CLOUD" | "UNKNOWN" {
  if (source === InferenceSource.ON_DEVICE || source === "ON_DEVICE") return "ON_DEVICE";
  if (source === InferenceSource.IN_CLOUD || source === "IN_CLOUD") return "IN_CLOUD";
  return "UNKNOWN";
}

export async function downloadOnDeviceModel(onProgress: (fraction: number) => void): Promise<void> {
  const model = createMoodModel("device", "en");
  await model.initializeDeviceModel(onProgress);
}

export type MoodTrace =
  | { type: "read" }
  | { type: "infer"; where: "device" | "cloud" }
  | { type: "inferred"; where: "device" | "cloud" | "unknown" }
  | { type: "genres" };

function tracedWhere(source: string): "device" | "cloud" | "unknown" {
  const badge = inferenceBadge(source);
  switch (badge) {
    case "ON_DEVICE":
      return "device";
    case "IN_CLOUD":
      return "cloud";
    case "UNKNOWN":
      return "unknown";
    default: {
      const unexpected: never = badge;
      return unexpected;
    }
  }
}

function finishTrace(source: string, onTrace?: (event: MoodTrace) => void): void {
  onTrace?.({ type: "inferred", where: tracedWhere(source) });
  onTrace?.({ type: "genres" });
}

export async function askMood(
  mood: string,
  onProgress: (fraction: number) => void,
  onTrace?: (event: MoodTrace) => void,
): Promise<{ plan: MoodPlan; source: string; fellBack: boolean }> {
  onTrace?.({ type: "read" });
  const route = routeMoodLanguage(mood);
  const language: OnDeviceLanguage = route.onDevice ? route.language : "en";
  const prompt = moodPrompt(mood, language);
  onTrace?.({ type: "infer", where: route.onDevice ? "device" : "cloud" });
  await requireAppCheckToken(firebaseApp());
  if (!route.onDevice) {
    return askCloud(prompt, language, false, onTrace);
  }

  const model = createMoodModel("device", language);
  void model.initializeDeviceModel(onProgress);
  try {
    const result = await generateMood(model.generateContent(prompt), "device");
    const source = String(result.response.inferenceSource ?? "");
    const plan = parseMoodPlan(result.response.text());
    if (plan) {
      finishTrace(source, onTrace);
      return { plan, source, fellBack: source === InferenceSource.IN_CLOUD || source === "IN_CLOUD" };
    }
    if (source === InferenceSource.IN_CLOUD || source === "IN_CLOUD") {
      throw new Error("The model did not return a usable filter. Try a shorter mood.");
    }
  } catch (error) {
    if (!(error instanceof DeadlineError)) throw error;
  }

  onTrace?.({ type: "infer", where: "cloud" });
  return askCloud(prompt, language, true, onTrace);
}

async function askCloud(
  prompt: string,
  language: OnDeviceLanguage,
  fellBack: boolean,
  onTrace?: (event: MoodTrace) => void,
): Promise<{ plan: MoodPlan; source: string; fellBack: boolean }> {
  const cloud = createMoodModel("cloud", language);
  const retry = await generateMood(cloud.generateContent(prompt), "cloud");
  const retryPlan = parseMoodPlan(retry.response.text());
  if (!retryPlan) throw new Error("The model did not return a usable filter. Try a shorter mood.");
  const retrySource = retry.response.inferenceSource ?? InferenceSource.IN_CLOUD;
  finishTrace(String(retrySource), onTrace);
  return { plan: retryPlan, source: retrySource, fellBack };
}

export async function runSpikePrompt(onProgress: (fraction: number) => void): Promise<{ text: string; source: string }> {
  const app = firebaseApp();
  ensureAppCheck(app);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: CLOUD_MODEL },
    onDeviceParams: {
      createOptions: {
        expectedInputs: [ENGLISH_OUTPUT],
        expectedOutputs: [ENGLISH_OUTPUT],
      },
    },
  });
  void model.initializeDeviceModel(onProgress);
  const result = await model.generateContent("Reply with exactly this sentence: Moodcut on-device check.");
  return {
    text: result.response.text(),
    source: result.response.inferenceSource ?? "",
  };
}
