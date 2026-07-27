"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, open, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [touchX, setTouchX] = useState<number | null>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  // 刚结束拖拽时抑制 click(否则松手会误触发 缩放/关闭)
  const draggingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setScale(1);
    }
  }, [open, initialIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
    setScale(1);
  }, [images.length]);

  const next = useCallback(() => {
    setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
    setScale(1);
  }, [images.length]);

  const toggleZoom = useCallback(() => {
    setScale((s) => (s === 1 ? 2 : 1));
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, prev, next]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // 当前图对应的缩略图自动滚入可见范围
  useEffect(() => {
    if (!open) return;
    const strip = thumbStripRef.current;
    const active = strip?.children[index] as HTMLElement | undefined;
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index, open]);

  // 主图左右滑动切换(未放大时)
  function onImageTouchEnd(clientX: number) {
    if (touchX === null) return;
    const dx = clientX - touchX;
    if (scale === 1 && Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    setTouchX(null);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-sheet-static=""
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={(e) => {
            if (draggingRef.current) return;
            onClose();
            e.stopPropagation();
          }}
        >
          {/* Top bar */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
            <span className="font-mono text-xs text-white/70">
              {index + 1} / {images.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleZoom(); }}
                className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
              >
                {scale > 1 ? (
                  <ZoomOut className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Image / Video */}
          {/\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(images[index]) ? (
            <motion.video
              key={index}
              src={images[index]}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="max-h-[85vh] max-w-[90vw] select-none object-contain"
              style={{ transform: `scale(${scale})`, transition: "transform 0.2s ease" }}
              onClick={(e) => { e.stopPropagation(); }}
              onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
              onTouchEnd={(e) => { e.stopPropagation(); onImageTouchEnd(e.changedTouches[0].clientX); }}
              controls
              autoPlay
              muted
            />
          ) : (
            <motion.img
              key={index}
              src={images[index]}
              alt=""
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale }}
              transition={{ duration: 0.2 }}
              className="max-h-[85vh] max-w-[90vw] select-none object-contain"
              style={{ touchAction: "pan-y" }}
              // 未放大时跟手左右拖拽切换(触摸/鼠标都可);到阈值或甩动松手即翻页
              drag={scale === 1 && images.length > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragStart={() => { draggingRef.current = true; }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60 || info.velocity.x < -500) next();
                else if (info.offset.x > 60 || info.velocity.x > 500) prev();
                setTimeout(() => { draggingRef.current = false; }, 0);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!draggingRef.current) toggleZoom();
              }}
              draggable={false}
            />
          )}

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          )}

          {/* Thumbnail strip — 横向可滑动;数量少时居中,多时可左右滚动 */}
          {images.length > 1 && (
            <div
              className="absolute bottom-4 left-0 right-0 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div ref={thumbStripRef} className="mx-auto flex w-max gap-1.5">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setIndex(i); setScale(1); }}
                    className={`h-12 w-16 shrink-0 border bg-black/50 transition-all ${
                      i === index
                        ? "border-white"
                        : "border-white/20 opacity-50 hover:opacity-80"
                    }`}
                  >
                    {/\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(img) ? (
                      <video src={img} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
