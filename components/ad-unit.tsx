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

export function AadsUnit({ id = "2430993", background = "transparent", className = "" }: { id?: string; background?: string; className?: string }) {
  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <div style={{ width: "100%", margin: "auto", position: "relative", zIndex: 99998 }}>
        <iframe
          data-aa={id}
          src={`//acceptable.a-ads.com/${id}/?size=Adaptive${background ? `&background_color=${background}` : ""}`}
          style={{
            border: 0,
            padding: 0,
            width: "70%",
            height: "auto",
            overflow: "hidden",
            display: "block",
            margin: "auto",
          }}
        />
      </div>
    </div>
  );
}
