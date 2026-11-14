export const PIXEL_ART = true;

export const NO_ART = `${import.meta.env.BASE_URL}no-art.svg`;

export const FLOOR_URL = "/assets/map/floor.png";

const images = new Map<string, HTMLImageElement>();
const status = new Map<string, "ok" | "missing">();
const listeners = new Set<() => void>();
let version = 0;

export function loadSprite(url: string): HTMLImageElement | null {
  if (!images.has(url)) {
    const img = new Image();
    images.set(url, img);
    const done = (s: "ok" | "missing") => {
      status.set(url, s);
      version++;
      listeners.forEach((fn) => fn());
    };
    img.onload = () => done("ok");
    img.onerror = () => done("missing");
    img.src = url;
  }
  return status.get(url) === "ok" ? images.get(url)! : null;
}

export function spriteStatus(url: string): "ok" | "missing" | undefined {
  loadSprite(url);
  return status.get(url);
}

export function spriteVersion() {
  return version;
}

export function onSpriteLoaded(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
