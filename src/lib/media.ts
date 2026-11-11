export type ProfileClip = {
  id: number;
  title: string;
  mediaKey: string;
  createdAt: string;
};

export function isVideoClip(key: string) {
  return key.startsWith("data:video/") || key.includes("/video");
}

export function readAsDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) {
    return Promise.reject(
      new Error(`Datei zu groß. Max ${Math.round(maxBytes / 1024)} KB.`),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Datei unlesbar."));
    reader.readAsDataURL(file);
  });
}

export function fileTitle(file: File) {
  return file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Clip";
}

export const SONG_MAX = 800_000;
export const CLIP_MAX = 4_500_000;
export const STORY_MAX = 4_500_000;
export const IMG_PREFIX = "img:";
export const GIF_PREFIX = "gif:";

export function isChatImage(body: string) {
  return body.startsWith("img:data:image/") || body.startsWith(GIF_PREFIX);
}

export function chatImageSrc(body: string) {
  if (body.startsWith(GIF_PREFIX)) return body.slice(GIF_PREFIX.length);
  return body.slice(IMG_PREFIX.length);
}

export function chatPreview(body: string) {
  if (isChatImage(body)) return "Foto";
  return body;
}

