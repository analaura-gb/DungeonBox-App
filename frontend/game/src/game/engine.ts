import Phaser from "phaser";
import {
  GameScene,
  type Callbacks,
  type GameStatus,
  type UpgradeOption,
} from "./scene";
import { PIXEL_ART } from "./sprites";
import type { GameData } from "./content";

export type {
  GameStatus,
  HudSnapshot,
  RunResult,
  UpgradeOption,
} from "./scene";

export class Game {
  private game: Phaser.Game;
  private scene: GameScene;

  constructor(parent: HTMLElement, cb: Callbacks, catalog: GameData) {
    this.scene = new GameScene(cb, catalog);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: "#070b14",
      pixelArt: PIXEL_ART,
      banner: false,
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: parent.clientWidth || window.innerWidth,
        height: parent.clientHeight || window.innerHeight,
      },
      physics: { default: "arcade", arcade: { fixedStep: false } },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      scene: this.scene,
    });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.game.destroy(true);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
      e.preventDefault();
    this.scene.keys.add(k);
    if (k === "p" || k === "escape") this.scene.togglePause();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.scene.keys.delete(e.key.toLowerCase());
  };

  start(charId: string) {
    this.scene.startRun(charId);
  }

  togglePause() {
    this.scene.togglePause();
  }

  click() {
    this.scene.audio.play("click");
  }

  toggleMute() {
    return this.scene.audio.toggleMute();
  }

  setStatus(s: GameStatus) {
    this.scene.setStatus(s);
  }

  applyUpgrade(o: UpgradeOption) {
    this.scene.applyUpgrade(o);
  }

  setTouch(x: number, y: number, active: boolean) {
    this.scene.touch.x = x;
    this.scene.touch.y = y;
    this.scene.touch.active = active;
  }
}
