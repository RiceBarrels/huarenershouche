"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

interface AdUnitProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  className?: string;
}

export function AdUnit({ slot, format = "auto", className = "" }: AdUnitProps) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, []);

  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-3873099216150179"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export function AadsUnit({ id = "2430994", background = "transparent", className = "" }: { id?: string; background?: string; className?: string }) {
  return (
    <div className={`ad-container ${className}`} style={{ width: "100%", minHeight: 100, position: "relative" }}>
      <iframe
        data-aa={id}
        src={`//acceptable.a-ads.com/${id}/?size=Adaptive${background ? `&background_color=${background}` : ""}`}
        style={{
          border: 0,
          padding: 0,
          width: "100%",
          height: 200,
          overflow: "hidden",
          display: "block",
        }}
        scrolling="no"
      />
    </div>
  );
}
