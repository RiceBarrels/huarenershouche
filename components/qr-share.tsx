"use client";

import { useState } from "react";
import { QrCode, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

interface QrShareProps {
  url: string;
  title: string;
}

export function QrShare({ url, title }: QrShareProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        variant="secondary"
        className="w-full gap-1.5 font-mono text-xs"
        onClick={() => setOpen(true)}
      >
        <QrCode className="h-3.5 w-3.5" strokeWidth={1.5} />
        {t("二维码")}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative mx-4 w-full max-w-xs rounded-xl bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Code"
                width={200}
                height={200}
                className="rounded-lg border border-border"
              />

              <p className="text-center font-mono text-xs leading-relaxed">
                {title}
              </p>

              <p className="font-mono text-[11px] text-muted-foreground">
                {t("扫码查看车辆详情")}
              </p>

              <Button
                variant="secondary"
                className="w-full gap-1.5 font-mono text-xs"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                {copied ? t("已复制") : t("复制链接")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
