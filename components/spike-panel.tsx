"use client";

import { Button, ProgressBar } from "@heroui/react";
import { useEffect, useState } from "react";

import { firebaseSetupIssue } from "@/lib/firebase-config";
import { downloadOnDeviceModel, isQuotaError, QUOTA_MESSAGE, runSpikePrompt } from "@/lib/firebase-ai";

type PromptApi = {
  availability: (options?: { expectedOutputs: { type: "text"; languages: string[] }[] }) => Promise<string>;
};

function readPromptApi(): PromptApi | null {
  const candidate = (window as Window & { LanguageModel?: PromptApi }).LanguageModel;
  if (!candidate || typeof candidate.availability !== "function") return null;
  return candidate;
}

export function SpikePanel() {
  const setupIssue = firebaseSetupIssue();
  const [chrome, setChrome] = useState("Checking this browser…");
  const [availability, setAvailability] = useState("Checking LanguageModel.availability()…");
  const [progress, setProgress] = useState<number | null>(null);
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const agent = navigator.userAgent;
      const version = /Chrome\/(\d+)/.exec(agent)?.[1];
      const branded = /Edg\//.test(agent) ? "Edge" : /OPR\//.test(agent) ? "Opera" : "Chrome-like";
      const number = version ? Number(version) : null;
      const ready = number !== null && number >= 139 && branded === "Chrome-like";
      setChrome(
        version
          ? `${branded} ${version}. On-device Gemini Nano needs desktop Chrome 139 or newer. This browser ${ready ? "meets" : "does not meet"} that check.`
          : "No Chrome version token was found. On-device inference needs desktop Chrome 139 or newer.",
      );
      const api = readPromptApi();
      if (!api) {
        setAvailability(
          "LanguageModel is not on window. Open chrome://flags/#prompt-api-for-gemini-nano-multimodal-input, set it to Enabled, and restart Chrome. Then reload this page.",
        );
        return;
      }
      void api
        .availability({ expectedOutputs: [{ type: "text", languages: ["en"] }] })
        .then((value) => {
          setAvailability(
            `LanguageModel.availability() returned “${value}”. available means the model can answer now. downloadable means it can be fetched. downloading means a fetch is already running. unavailable means this Chrome cannot run Nano.`,
          );
        })
        .catch((error: unknown) => {
          setAvailability(error instanceof Error ? error.message : "availability() failed.");
        });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function onDownload() {
    setOutput("");
    setProgress(0);
    try {
      await downloadOnDeviceModel((fraction) => setProgress(Math.round(fraction * 100)));
      setProgress(100);
      setOutput("initializeDeviceModel finished.");
    } catch (error) {
      setOutput(isQuotaError(error) ? QUOTA_MESSAGE : error instanceof Error ? error.message : "Download failed.");
    }
  }

  async function onPrompt() {
    setBusy(true);
    setOutput("");
    try {
      const result = await runSpikePrompt((fraction) => setProgress(Math.round(fraction * 100)));
      setOutput(`inferenceSource: ${result.source || "(missing)"}\n\n${result.text}`);
    } catch (error) {
      setOutput(isQuotaError(error) ? QUOTA_MESSAGE : error instanceof Error ? error.message : "The prompt failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-pad max-w-3xl">
      <p className="text-xs font-bold tracking-[0.16em] uppercase">Risk spike</p>
      <h1 className="display mt-3 text-6xl">On-device check</h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          This page is for checking Gemini Nano on your own laptop. It does not change the catalogue. Mood search on the
          home page uses the same Firebase AI Logic setup: <code>getAI</code>, <code>GoogleAIBackend</code>,{" "}
          <code>InferenceMode.PREFER_ON_DEVICE</code>, and App Check with reCAPTCHA Enterprise.
        </p>
        <p>{chrome}</p>
        <p>
          Flag: <code>chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</code>. Set it to Enabled and restart
          Chrome. The built-in model accepts English, Japanese, Spanish, German, and French.
        </p>
        <p>{availability}</p>
        {setupIssue ? <p>{setupIssue} The two buttons below need that config. The browser checks above do not.</p> : null}
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button onPress={() => void onDownload()} isDisabled={Boolean(setupIssue) || busy}>
          Download on-device model
        </Button>
        <Button variant="outline" onPress={() => void onPrompt()} isDisabled={Boolean(setupIssue) || busy}>
          Run one prompt
        </Button>
      </div>
      {progress !== null ? (
        <div className="mt-6 max-w-md">
          <ProgressBar aria-label="Download progress" value={progress} minValue={0} maxValue={100}>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
            <ProgressBar.Output />
          </ProgressBar>
        </div>
      ) : null}
      {output ? <pre className="mt-6 max-w-2xl text-sm whitespace-pre-wrap">{output}</pre> : null}
    </section>
  );
}
