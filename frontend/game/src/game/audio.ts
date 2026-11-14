import Phaser from "phaser";

const BASE = "/assets/audio";
const MUTED_KEY = "dungeonbox:muted";
const MUSIC_VOLUME = 0.35;

type SoundConfig = { volume: number; gap?: number; max?: number };

export const SOUNDS = {
  shoot: { volume: 0.2, gap: 90, max: 3 },
  pop: { volume: 0.3, gap: 45, max: 4 },
  xp: { volume: 0.2, gap: 35, max: 3 },
  hurt: { volume: 0.55, gap: 200, max: 1 },
  wave: { volume: 0.3, gap: 150, max: 2 },
  swish: { volume: 0.3, gap: 120, max: 2 },
  click: { volume: 0.35, gap: 60 },
  levelup: { volume: 0.45 },
  heal: { volume: 0.45 },
  magnet: { volume: 0.45 },
  nuke: { volume: 0.6 },
  boss: { volume: 0.5 },
  gameover: { volume: 0.55 },
  win: { volume: 0.55 },
} satisfies Record<string, SoundConfig>;

export type SoundKey = keyof typeof SOUNDS;

type MusicSound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

export function readMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    return;
  }
}

export function loadAudio(scene: Phaser.Scene) {
  for (const key of Object.keys(SOUNDS)) {
    scene.load.audio(`sfx:${key}`, [
      `${BASE}/${key}.ogg`,
      `${BASE}/${key}.mp3`,
    ]);
  }
  scene.load.audio("music", [`${BASE}/music.ogg`, `${BASE}/music.mp3`]);
}

export class GameAudio {
  private scene: Phaser.Scene;
  private lastPlayed = new Map<SoundKey, number>();
  private music: MusicSound | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.sound.mute = readMuted();
  }

  play(key: SoundKey, detune = 0) {
    const name = `sfx:${key}`;
    if (!this.scene.cache.audio.exists(name)) return;

    const config: SoundConfig = SOUNDS[key];
    const now = performance.now();
    if (
      config.gap &&
      now - (this.lastPlayed.get(key) ?? -Infinity) < config.gap
    )
      return;
    if (
      config.max &&
      this.scene.sound.getAll(name).filter((s) => s.isPlaying).length >=
        config.max
    )
      return;

    this.lastPlayed.set(key, now);
    this.scene.sound.play(name, { volume: config.volume, detune });
  }

  startMusic() {
    if (!this.scene.cache.audio.exists("music")) return;
    if (!this.music)
      this.music = this.scene.sound.add("music", {
        loop: true,
        volume: MUSIC_VOLUME,
      }) as MusicSound;
    this.music.setVolume(MUSIC_VOLUME);
    this.music.stop();
    this.music.play();
  }

  setMusicLevel(level: "full" | "low" | "off") {
    if (!this.music) return;
    if (level === "off") this.music.stop();
    else
      this.music.setVolume(
        level === "full" ? MUSIC_VOLUME : MUSIC_VOLUME * 0.3,
      );
  }

  toggleMute() {
    const muted = !this.scene.sound.mute;
    this.scene.sound.mute = muted;
    writeMuted(muted);
    return muted;
  }
}
