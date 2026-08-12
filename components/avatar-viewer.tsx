"use client";

// 头像查看器:点击头像全屏放大(黑底居中),右上角「⋯」打开底部操作单
// (保存图片;是自己的头像时还可「更换头像」)。
// · 注册进浮层栈:系统返回键/手势逐层关闭,层级随栈分配;
// · 整体 portal 到 body:宿主可能在 vaul drawer 内(内容节点带 transform,
//   会把内联 fixed 元素钳在 drawer 盒子里);
// · 保存:fetch → navigator.share 文件分享(iOS 面板含「存储图像」),
//   不支持时退回 a[download] 下载。

import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Download, Camera, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NonModalDrawer } from "@/components/non-modal-drawer";
import {
  OverlayLayerRegistryCtx,
  OverlayLayerZCtx,
} from "@/components/overlay-stack";
import { acquireNativeBarHideLock } from "@/lib/liquid-glass-nav";
import { photoSaverAvailable, saveBlobToPhotos } from "@/lib/photo-saver";
import { triggerHaptic } from "@/lib/haptics";

export function AvatarViewer({
  src,
  alt = "头像",
  open,
  onClose,
  onEdit,
}: {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
  /** 自己的头像:提供后菜单里出现「更换头像」 */
  onEdit?: () => void;
}) {
  const registry = useContext(OverlayLayerRegistryCtx);
  const zMap = useContext(OverlayLayerZCtx);
  const id = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // 「已保存到相册」轻提示(原生直存成功后短暂展示)
  const [savedTip, setSavedTip] = useState(false);
  useEffect(() => {
    if (!savedTip) return;
    const t = setTimeout(() => setSavedTip(false), 1600);
    return () => clearTimeout(t);
  }, [savedTip]);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // 注册浮层栈:系统返回键/浏览器返回优先关闭本层
  useEffect(() => {
    if (!open || !registry) return;
    registry.register(id, () => onCloseRef.current());
    return () => registry.release(id);
  }, [open, registry, id]);

  // 展示期间锁背景滚动 + 隐藏 iOS 原生底部导航;Esc 关闭
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const unlock = acquireNativeBarHideLock();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      unlock();
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const z = (open ? zMap?.get(id) : undefined) ?? 80;

  async function saveImage() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(src);
      const blob = await res.blob();

      // iOS 原生壳:直接写入系统相册(失败时降级到分享面板)
      if (photoSaverAvailable()) {
        try {
          await saveBlobToPhotos(blob);
          triggerHaptic();
          setMenuOpen(false);
          setSavedTip(true);
          setSaving(false);
          return;
        } catch {
          /* 权限被拒等 → 走下面的分享路径 */
        }
      }

      const ext = (blob.type.split("/")[1] || "jpg")
        .replace("jpeg", "jpg")
        .replace("svg+xml", "svg");
      const file = new File([blob], `avatar.${ext}`, {
        type: blob.type || "image/jpeg",
      });
      if (navigator.canShare?.({ files: [file] })) {
        // 系统分享面板,含「存储图像」
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
      triggerHaptic();
      setMenuOpen(false);
    } catch {
      /* 用户取消分享/跨域失败:保持面板打开即可 */
    }
    setSaving(false);
  }

  return (
    <>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 flex items-center justify-center bg-black"
                style={{ zIndex: z }}
                data-app-overlay=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={onClose}
              >
                <motion.img
                  src={src}
                  alt={alt}
                  className="max-h-[80vh] w-full select-none object-contain"
                  draggable={false}
                  initial={{ scale: 0.88 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.94 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
                {/* 右上角:更多操作 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(true);
                  }}
                  className="absolute right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors active:bg-white/25"
                  style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
                  aria-label="更多操作"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
                </button>
                {/* 已保存到相册轻提示 */}
                <AnimatePresence>
                  {savedTip && (
                    <motion.span
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 font-mono text-xs text-white backdrop-blur-sm"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      已保存到相册
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* 操作单 */}
      <NonModalDrawer open={menuOpen} onOpenChange={setMenuOpen}>
        <div className="divide-y divide-border px-2 pb-2 pt-1">
          <button
            type="button"
            onClick={saveImage}
            className="flex w-full items-center justify-center gap-2 py-3.5 font-mono text-sm transition-colors active:bg-muted/50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Download className="h-4 w-4" strokeWidth={1.5} />
            )}
            保存图片
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onClose();
                onEdit();
              }}
              className="flex w-full items-center justify-center gap-2 py-3.5 font-mono text-sm transition-colors active:bg-muted/50"
            >
              <Camera className="h-4 w-4" strokeWidth={1.5} />
              更换头像
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="w-full py-3.5 text-center font-mono text-sm text-muted-foreground transition-colors active:bg-muted/50"
          >
            取消
          </button>
        </div>
      </NonModalDrawer>
    </>
  );
}
