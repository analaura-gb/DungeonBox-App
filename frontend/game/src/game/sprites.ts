// ---------------------------------------------------------------------------
// SPRITES — where each image lives.
//
// Put the PNGs in  public/sprites/<folder>/<id>.png
// If a file is missing, the game falls back to the old emoji.
// ---------------------------------------------------------------------------

// true  = crisp pixel art (no blurring when scaled up)
// false = smooth / hand-drawn art
export const PIXEL_ART = true;

// BASE_URL is "/game/" (vite.config.ts), so sprites load from /game/sprites/...
const BASE = `${import.meta.env.BASE_URL}sprites`;

export const spriteUrl = {
  character: (id: string) => `${BASE}/characters/${id}.png`,
  enemy: (id: string) => `${BASE}/enemies/${id}.png`,
  boss: (id: string) => `${BASE}/bosses/${id}.png`,
  weapon: (id: string) => `${BASE}/weapons/${id}.png`,
  passive: (id: string) => `${BASE}/passives/${id}.png`,
  pickup: (id: string) => `${BASE}/pickups/${id}.png`,
  map: (id: string) => `${BASE}/map/${id}.png`,
};

// Each image is requested only once; the result ("ok" / "missing") is remembered.
const images = new Map<string, HTMLImageElement>();
const status = new Map<string, "ok" | "missing">();
const listeners = new Set<() => void>();
// goes up every time a sprite finishes loading (lets React know something changed)
let version = 0;

// Returns the image once it has loaded, otherwise null (still loading or missing).
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

// "ok", "missing", or undefined while still loading.
export function spriteStatus(url: string): "ok" | "missing" | undefined {
  loadSprite(url);
  return status.get(url);
}

// Changes whenever a sprite finishes loading (for React's useSyncExternalStore).
export function spriteVersion() {
  return version;
}

// Calls fn whenever any sprite finishes loading. Returns an unsubscribe function.
export function onSpriteLoaded(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
