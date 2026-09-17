"use client";

import { useState } from "react";

type CoverImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  compact?: boolean;
};

export default function CoverImage({ src, alt = "", className, width = 720, height = 480, priority = false, compact = false }: CoverImageProps) {
  const coverSrc = src?.trim() || "";
  const [failedSrc, setFailedSrc] = useState("");
  const classes = [className, compact ? "coverCompact" : ""].filter(Boolean).join(" ");

  if (!coverSrc || failedSrc === coverSrc) {
    return (
      <div className={`coverFallback${compact ? " coverFallbackCompact" : ""}${className ? ` ${className}` : ""}`} aria-hidden="true">
        <b>99</b>
        <span>99GOLD.NET</span>
      </div>
    );
  }

  return (
    // Decorative listing/article covers; never dump long alt text into the layout.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={priority ? "(max-width: 900px) 100vw, 760px" : "(max-width: 650px) 100vw, 50vw"}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={classes}
      onError={() => setFailedSrc(coverSrc)}
    />
  );
}
