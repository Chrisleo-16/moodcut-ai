import type { Metadata } from "next";

import { SpikePanel } from "@/components/spike-panel";

export const metadata: Metadata = {
  title: "On-device check",
  description: "Check Chrome, Gemini Nano availability, the on-device model download, and inferenceSource.",
};

export default function SpikePage() {
  return <SpikePanel />;
}
