const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1440;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (file.size < 200 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = (width * MAX_HEIGHT) / height;
        height = MAX_HEIGHT;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
          } else {
            resolve(file);
          }
        },
        "image/webp",
        QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 30; // seconds

export async function validateVideo(file: File): Promise<{ valid: boolean; error?: string }> {
  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: `视频文件不能超过 50MB（当前 ${Math.round(file.size / 1024 / 1024)}MB）` };
  }

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (video.duration > MAX_VIDEO_DURATION) {
        resolve({ valid: false, error: `视频时长不能超过 ${MAX_VIDEO_DURATION} 秒（当前 ${Math.round(video.duration)} 秒）` });
      } else {
        resolve({ valid: true });
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: "无法读取视频文件" });
    };
    video.src = url;
  });
}
