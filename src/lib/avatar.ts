export function isPhotoAvatar(key?: string | null): boolean {
  if (!key) return false;
  return (
    key.startsWith("data:image/") ||
    key.startsWith("http://") ||
    key.startsWith("https://")
  );
}

function encodeCover(file: File, width: number, height: number, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Nur Bilder."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas fehlt.");
        const scale = Math.max(width / (img.width || 1), height / (img.height || 1));
        const sw = width / scale;
        const sh = height / scale;
        const sx = ((img.width || 1) - sw) / 2;
        const sy = ((img.height || 1) - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
        const data = canvas.toDataURL("image/jpeg", quality);
        URL.revokeObjectURL(url);
        if (!data.startsWith("data:image/jpeg")) throw new Error("Bild fehlgeschlagen.");
        resolve(data);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error("Bild fehlgeschlagen."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild ungültig."));
    };
    img.src = url;
  });
}

export function compressAvatar(file: File): Promise<string> {
  return encodeCover(file, 192, 192, 0.7);
}

export function compressArt(file: File): Promise<string> {
  return encodeCover(file, 280, 280, 0.72);
}

export function compressBanner(file: File): Promise<string> {
  return encodeCover(file, 600, 240, 0.74);
}

export function compressChatImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Nur Bilder."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const max = 560;
        const scale = Math.min(1, max / Math.max(img.width, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas fehlt.");
        ctx.drawImage(img, 0, 0, w, h);
        const data = canvas.toDataURL("image/jpeg", 0.7);
        URL.revokeObjectURL(url);
        resolve(data);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error("Bild fehlgeschlagen."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild ungültig."));
    };
    img.src = url;
  });
}
