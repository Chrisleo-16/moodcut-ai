"use client";

import { Button, Modal, useOverlayState } from "@heroui/react";
import { createContext, useContext, useState, type ReactNode } from "react";

import { youtubeEmbed } from "@/lib/media";

type TrailerRequest = {
  youtubeKey: string;
  title: string;
  note?: string;
};

type TrailerValue = {
  openTrailer: (request: TrailerRequest) => void;
};

const TrailerContext = createContext<TrailerValue | null>(null);

export function TrailerProvider({ children }: { children: ReactNode }) {
  const state = useOverlayState();
  const [request, setRequest] = useState<TrailerRequest | null>(null);
  const embed = request ? youtubeEmbed(request.youtubeKey) : null;

  const value: TrailerValue = {
    openTrailer: (next) => {
      if (!youtubeEmbed(next.youtubeKey)) return;
      setRequest(next);
      state.open();
    },
  };

  return (
    <TrailerContext.Provider value={value}>
      {children}
      <Modal state={state}>
        <Modal.Backdrop isDismissable variant="blur" className="bg-black/92">
          <Modal.Container size="full" placement="center">
            <Modal.Dialog className="m-0 h-[100svh] max-h-none w-screen max-w-none rounded-none bg-black p-0 text-white" aria-label={request ? `${request.title} trailer` : "Trailer"}>
              <div className="flex h-[100svh] flex-col px-5 pt-5 pb-6">
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="h-11 w-11 min-w-11 border-white text-white" slot="close" aria-label="Close trailer">
                    ×
                  </Button>
                  <Modal.Heading className="text-xs font-bold tracking-[0.14em] text-white uppercase">
                    {request?.title ?? "Trailer"}
                  </Modal.Heading>
                </div>
                <div className="flex flex-1 items-center">
                  {embed ? (
                    <iframe
                      title={request ? `${request.title} official trailer` : "Official trailer"}
                      src={state.isOpen ? embed : undefined}
                      className="aspect-video w-full bg-black"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <p>No official trailer is available.</p>
                  )}
                </div>
                {request?.note ? <p className="text-sm text-white/80">{request.note}</p> : null}
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </TrailerContext.Provider>
  );
}

export function useTrailer(): TrailerValue {
  const value = useContext(TrailerContext);
  if (!value) throw new Error("useTrailer must be used inside TrailerProvider");
  return value;
}

export function TrailerButton({
  youtubeKey,
  title,
  note,
  label = "Trailer",
  tone = "light",
}: {
  youtubeKey: string | null;
  title: string;
  note?: string;
  label?: string;
  tone?: "light" | "dark";
}) {
  const { openTrailer } = useTrailer();
  if (!youtubeKey) return null;
  return (
    <button
      type="button"
      className={tone === "light" ? "cta-line" : "cta-line cta-dark"}
      onClick={() => openTrailer({ youtubeKey, title, note })}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      {label}
    </button>
  );
}
