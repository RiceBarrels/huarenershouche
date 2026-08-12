// PhotoSaver 本地插件封装:iOS 壳内把图片直接写入系统相册
// (原生实现见 ios/App/App/PhotoSaverPlugin.swift)

import { Capacitor, registerPlugin } from "@capacitor/core";

interface PhotoSaverPlugin {
  save(options: { base64: string }): Promise<void>;
}

const PhotoSaver = registerPlugin<PhotoSaverPlugin>("PhotoSaver");

/** 是否可用原生「存入相册」(仅 iOS 原生壳) */
export function photoSaverAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// SVG(如 DiceBear 默认头像)先栅格化成 PNG:UIImage 不认 SVG 数据
async function rasterizeToPngBase64(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("svg load failed"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 512;
    canvas.height = img.naturalHeight || 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png").split(",")[1] || "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 把图片 blob 直接存入相册;失败(权限拒绝等)时抛错,调用方自行降级 */
export async function saveBlobToPhotos(blob: Blob): Promise<void> {
  const base64 = blob.type.includes("svg")
    ? await rasterizeToPngBase64(blob)
    : await blobToBase64(blob);
  if (!base64) throw new Error("empty image");
  await PhotoSaver.save({ base64 });
}
