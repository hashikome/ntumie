"use client";
import { useApiOrigin } from "./api-origin";

// The hub's mark comes from the API (generated from the hub's ID; no media is
// stored), like person avatars, so every client shows the same one.
export function HubMark({ hubId, size = 22 }: { hubId: string; size?: number }) {
  const origin = useApiOrigin();
  return (
    // biome-ignore lint/performance/noImgElement: The API owns the mark; it is a small SVG.
    <img
      className="hub-mark"
      src={`${origin}/api/v1/hubs/${encodeURIComponent(hubId)}/avatar?size=${size * 2}`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
