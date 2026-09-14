"use client";

import { useState } from "react";

type CoverImageProps = {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
};

export default function CoverImage({ src, alt = "", className, width = 1536, height = 1024 }: CoverImageProps) {
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
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
