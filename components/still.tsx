import Image from "next/image";

import { imageUrl } from "@/lib/media";

type StillProps = {
  path: string | null | undefined;
  size: string;
  alt: string;
  className?: string;
  /** Intrinsic shape of the TMDB asset: backdrops are 16:9, posters and profiles are 2:3. */
  shape?: "landscape" | "portrait";
  sizes?: string;
};

export function Still({ path, size, alt, className, shape = "landscape", sizes }: StillProps) {
  const src = imageUrl(path, size);
  if (!src) {
    return <div className={className} aria-hidden />;
  }
  const portrait = shape === "portrait";
  return (
    <Image
      src={src}
      alt={alt}
      width={portrait ? 500 : 1280}
      height={portrait ? 750 : 720}
      sizes={sizes}
      unoptimized={src.endsWith(".svg")}
      className={className}
    />
  );
}
