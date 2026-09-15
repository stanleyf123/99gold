"use client";

import { useState } from "react";

type CoverImageProps = {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export default function CoverImage({ src, alt = "", className, width = 720, height = 480, priority = false }: CoverImageProps) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div className={`coverFallback${className ? ` ${className}` : ""}`} aria-hidden="true">
        <b>99</b>
        <span>99GOLD.NET</span>
      </div>
    );
  }

  return (
    // Decorative listing/article covers; never dump long alt text into the layout.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={priority ? "(max-width: 900px) 100vw, 760px" : "(max-width: 650px) 100vw, 50vw"}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
