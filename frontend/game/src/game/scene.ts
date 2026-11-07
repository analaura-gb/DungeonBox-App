// ---------------------------------------------------------------------------
// GameScene — all gameplay, running on Phaser (WebGL + Arcade Physics).
// React (App.tsx) draws menus/HUD on top and talks to this scene through
// the small API in engine.ts.
// ---------------------------------------------------------------------------
import Phaser from "phaser";
import {
  BOSSES,
  CHARACTERS,
  ENEMIES,
  ENEMY_DAMAGE_MUL,
  FLOOR_DIM,
  FLOOR_TILE_SIZE,
  MAX_PASSIVES,
  MAX_WEAPONS,
  NUKE_DROP_CHANCE,
  PASSIVES,
  TIME_LIMIT,
  WEAPONS,
  xpForLevel,
  type CharacterDef,
  type EnemyDef,
  type PassiveId,
  type WeaponId,
} from "./content";
import { spriteUrl } from "./sprites";
import { createGeneratedTextures, emojiTexture, hueVariants } from "./textures";

// ---------------------------------------------------------------- helpers
const TAU = Math.PI * 2;
const rand = Phaser.Math.FloatBetween;
// frame-rate independent damping: same feel at 60, 120 or 144 Hz
const decay = (f: number, dt: number) => Math.pow(f, dt * 60);

const colorCache = new Map<string, number>();
const hex = (c: string) => {
  let v = colorCache.get(c);
  if (v === undefined) colorCache.set(c, (v = Phaser.Display.Color.HexStringToColor(c).color));
  return v;
};

const MAX_ENEMIES = 340;
const PLAYER_SIZE = 42;
const PLAYER_RADIUS = 16;

// draw order (higher = on top)
const DEPTH = { floor: 0, pickups: 1, under: 2, enemies: 3, over: 4, shots: 5, player: 6, particles: 7, text: 8, flash: 9 };

// ---------------------------------------------------------------- types shared with React
export interface HudSnapshot {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNext: number;
  time: number;
  kills: number;
  score: number;
  weapons: { id: WeaponId; level: number }[];
  passives: { id: PassiveId; level: number }[];
  boss: { name: string; hp: number; maxHp: number } | null;
}

export interface UpgradeOption {
  key: string;
  kind: "weapon" | "passive" | "heal";
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  level: number;
  isNew: boolean;
}

export type GameStatus = "menu" | "playing" | "paused" | "levelup" | "dead" | "won";

export interface RunResult {
  score: number;
  time: number;
  kills: number;
  level: number;
  won: boolean;
  weapons: { id: WeaponId; level: number }[];
  passives: { id: PassiveId; level: number }[];
}

export interface Callbacks {
  onHud: (h: HudSnapshot) => void;
  onStatus: (s: GameStatus) => void;
  onLevelUp: (opts: UpgradeOption[]) => void;
  onGameOver: (result: RunResult) => void;
}

// ---------------------------------------------------------------- pooled game objects
class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  def!: EnemyDef;
  hp = 0;
  maxHp = 0;
  flash = 0;
  slow = 0;
  burn = 0;
  burnT = 0;
  wob = 0;
  kx = 0;
  ky = 0;
  hitCd: Record<string, number> = {};
}

class Bullet extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  dmg = 0;
  life = 0;
  pierce = 0;
  kind: "bolt" | "drone" = "bolt";
  homing = false;
  explode = false;
  color = 0xffffff;
  hitSet = new Set<Enemy>();
}

class Pickup extends Phaser.GameObjects.Image {
  kind: "xp" | "heal" | "magnet" | "nuke" = "xp";
  value = 0;
  t = 0;
  vx = 0;
  vy = 0;
  wx = 0; // world position (x/y of the image also include the bobbing)
  wy = 0;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  speed: number;
  dmg: number;
  knock: number;
  color: number;
  width: number;
  hitSet: Set<Enemy>;
}

interface Arc {
  ang: number;
  half: number;
  range: number;
  life: number;
  maxLife: number;
}

interface FloatText {
  obj: Phaser.GameObjects.BitmapText;
  life: number;
  maxLife: number;
  vy: number;
}

interface WeaponState {
  id: WeaponId;
  level: number;
  timer: number;
  phase: number;
}

// how many books orbit at each level (weapon id is still "duck") (used by logic and drawing)
// Weapons go up to level 8 (maxLevel in content.ts); passives too.
const duckCount = (L: number) => 1 + (L >= 2 ? 1 : 0) + (L >= 3 ? 1 : 0) + (L >= 5 ? 1 : 0) + (L >= 7 ? 1 : 0) + (L >= 8 ? 1 : 0);
const gcRadius = (L: number) => 96 + 16 * L + (L >= 8 ? 24 : 0); // garbage collector zone

// ---------------------------------------------------------------- scene
export class GameScene extends Phaser.Scene {
  cb: Callbacks;
  status: GameStatus = "menu";
  ready = false;
  pendingStart: string | null = null;

  // input (filled by engine.ts)
  keys = new Set<string>();
  touch = { x: 0, y: 0, active: false };

  char: CharacterDef = CHARACTERS[0];

  // player
  px = 0;
  py = 0;
  pvx = 0;
  pvy = 0;
  facing = 0;
  hp = 100;
  maxHp = 100;
  speed = 200;
  damageMul = 1;
  xpMul = 1;
  pickupRadius = 85;
  armor = 0;
  cdMul = 1;
  regen = 0;
  iframe = 0;
  walkT = 0;

  // run
  level = 1;
  xp = 0;
  xpNext = 6;
  kills = 0;
  score = 0;
  elapsed = 0;
  weapons: WeaponState[] = [];
  passives: Partial<Record<PassiveId, number>> = {};
  spawnTimer = 0;
  bossTimer = 70;
  bossIndex = 0;
  boss: Enemy | null = null;
  hudTick = 0;

  // effects state
  rings: Ring[] = [];
  arcs: Arc[] = [];
  texts: FloatText[] = [];
  hurtFlash = 0;
  whiteFlash = 0;
  burstColor = 0xffffff;
  burstSpeed = 160;
  auraLevel = 0;
  gcPulse = 0; // 1 right after a garbage collector tick, fades to 0

  // phaser objects (created in create())
  floor!: Phaser.GameObjects.TileSprite;
  tile = FLOOR_TILE_SIZE;
  player!: Phaser.GameObjects.Sprite;
  hasWalk = false;
  enemies!: Phaser.Physics.Arcade.Group;
  bullets!: Phaser.Physics.Arcade.Group;
  pickups!: Phaser.GameObjects.Group;
  duckImgs: Phaser.GameObjects.Image[] = [];
  under!: Phaser.GameObjects.Graphics;
  over!: Phaser.GameObjects.Graphics;
  aura!: Phaser.GameObjects.Graphics;
  sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  hurtRect!: Phaser.GameObjects.Rectangle;
  whiteRect!: Phaser.GameObjects.Rectangle;
  xpKey = "xp";
  droneKey = "weapon:drone";
  shotKey = "bolt";
  balloonKeys: string[] = [];
  balloonColors: number[] = [];

  constructor(cb: Callbacks) {
    super("game");
    this.cb = cb;
  }

  // ------------------------------------------------------------- loading
  preload() {
    // A missing PNG just fails to load; create() then uses the emoji instead.
    for (const c of CHARACTERS) {
      this.load.image(`char:${c.id}`, spriteUrl.character(c.id));
      this.load.image(`char:${c.id}-walk`, spriteUrl.character(c.id + "-walk"));
    }
    for (const e of ENEMIES) this.load.image(`enemy:${e.id}`, spriteUrl.enemy(e.id));
    for (const b of BOSSES) this.load.image(`boss:${b.id}`, spriteUrl.boss(b.id));
    for (const id of ["compiler", "duck", "drone", "drone-shot"]) this.load.image(`weapon:${id}`, spriteUrl.weapon(id));
    for (const id of ["xp", "heal", "magnet", "nuke"]) this.load.image(`pickup:${id}`, spriteUrl.pickup(id));
    this.load.image("floor", spriteUrl.map("floor"));
  }

  create() {
    createGeneratedTextures(this);

    // emoji fallbacks for every sprite that has no PNG
    for (const c of CHARACTERS) emojiTexture(this, `char:${c.id}`, c.icon);
    for (const e of ENEMIES) emojiTexture(this, `enemy:${e.id}`, e.icon);
    for (const b of BOSSES) emojiTexture(this, `boss:${b.id}`, b.icon, 128);
    emojiTexture(this, "weapon:duck", "🦆", 48);
    emojiTexture(this, "weapon:drone", "🛸", 32);
    emojiTexture(this, "pickup:heal", "🍕", 32);
    emojiTexture(this, "pickup:magnet", "💾", 32);
    emojiTexture(this, "pickup:nuke", "☢️", 32);
    if (this.textures.exists("pickup:xp")) this.xpKey = "pickup:xp";
    // a single drone for the projectile (falls back to the weapon icon)
    if (this.textures.exists("weapon:drone-shot")) this.droneKey = "weapon:drone-shot";
    // Programming Balloon shoots its own icon (falls back to the glowing bolt)
    if (this.textures.exists("weapon:compiler")) {
      this.shotKey = "weapon:compiler";
      // 6 balloon colors (pink, orange, yellow, green, blue, purple...), picked at random per shot
      const v = hueVariants(this, this.shotKey, 6, hex(WEAPONS.compiler.color));
      this.balloonKeys = v.keys;
      this.balloonColors = v.colors;
    }

    // floor: one repeating tile (your floor.png, or the old circuit grid)
    const hasFloor = this.textures.exists("floor");
    const floorKey = hasFloor ? "floor" : "grid";
    this.tile = hasFloor ? FLOOR_TILE_SIZE : 400;
    const src = this.textures.get(floorKey).getSourceImage();
    this.floor = this.add.tileSprite(0, 0, 1, 1, floorKey).setOrigin(0).setDepth(DEPTH.floor);
    this.floor.setTileScale(this.tile / src.width, this.tile / src.height);
    if (hasFloor) {
      const v = Math.round(255 * (1 - FLOOR_DIM));
      this.floor.setTint(Phaser.Display.Color.GetColor(v, v, v));
    }

    this.under = this.add.graphics().setDepth(DEPTH.under);
    this.aura = this.add.graphics().setDepth(DEPTH.under);
    this.over = this.add.graphics().setDepth(DEPTH.over);
    this.player = this.add.sprite(0, 0, `char:${this.char.id}`).setDepth(DEPTH.player);
    for (let i = 0; i < 6; i++) this.duckImgs.push(this.add.image(0, 0, "weapon:duck").setDepth(DEPTH.shots).setVisible(false));

    // pools (objects are reused instead of created/destroyed)
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: MAX_ENEMIES });
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 200 });
    this.pickups = this.add.group({ classType: Pickup, maxSize: 420 });

    // enemies push each other apart; bullets hit enemies
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.bulletHit(b as unknown as Bullet, e as unknown as Enemy));

    // one particle emitter for every burst (color/speed set per burst)
    this.sparks = this.add
      .particles(0, 0, "px", {
        emitting: false,
        lifespan: { min: 250, max: 600 },
        angle: { min: 0, max: 360 },
        speed: { onEmit: () => rand(this.burstSpeed * 0.15, this.burstSpeed * 0.5) },
        scale: { start: 1, end: 0.3 },
        alpha: { start: 1, end: 0 },
        tint: { onEmit: () => this.burstColor },
      })
      .setDepth(DEPTH.particles);

    // full-screen flashes (hurt = red, level up / boss kill = white)
    this.hurtRect = this.add.rectangle(0, 0, 1, 1, 0xff2850).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.flash).setAlpha(0);
    this.whiteRect = this.add.rectangle(0, 0, 1, 1, 0xffffff).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.flash).setAlpha(0);

    this.ready = true;
    if (this.pendingStart) this.startRun(this.pendingStart);
    else this.setStatus(this.status);
    this.draw();
  }

  // ------------------------------------------------------------- status
  setStatus(s: GameStatus) {
    this.status = s;
    if (this.ready) {
      // freeze physics, timers and particles whenever we're not playing
      const run = s === "playing";
      if (run) this.physics.world.resume();
      else this.physics.world.pause();
      this.time.paused = !run;
      if (run) this.sparks.resume();
      else this.sparks.pause();
    }
    this.cb.onStatus(s);
  }

  togglePause() {
    if (this.status === "playing") this.setStatus("paused");
    else if (this.status === "paused") this.setStatus("playing");
  }

  startRun(charId: string) {
    if (!this.ready) {
      this.pendingStart = charId;
      return;
    }
    this.pendingStart = null;
    const c = CHARACTERS.find((x) => x.id === charId) ?? CHARACTERS[0];
    this.char = c;
    this.px = this.py = this.pvx = this.pvy = 0;
    this.maxHp = this.hp = c.hp;
    this.speed = c.speed;
    this.damageMul = c.damageMul;
    this.xpMul = c.xpMul;
    this.pickupRadius = c.pickupRadius;
    this.armor = 0;
    this.cdMul = 1;
    this.regen = 0;
    this.iframe = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpForLevel(1);
    this.kills = 0;
    this.score = 0;
    this.elapsed = 0;
    this.weapons = [{ id: c.startWeapon, level: 1, timer: 0.25, phase: 0 }];
    this.passives = {};
    this.spawnTimer = 0;
    this.bossTimer = 70;
    this.bossIndex = 0;
    this.boss = null;
    this.rings = [];
    this.arcs = [];
    this.hurtFlash = this.whiteFlash = 0;
    this.auraLevel = 0;
    this.gcPulse = 0;

    // return every pooled object to its pool
    for (const e of this.enemies.getChildren() as Enemy[]) e.disableBody(true, true);
    for (const b of this.bullets.getChildren() as Bullet[]) b.disableBody(true, true);
    for (const p of this.pickups.getChildren() as Pickup[]) p.setActive(false).setVisible(false);
    for (const t of this.texts) {
      t.life = 0;
      t.obj.setVisible(false);
    }
    this.sparks.killAll();
    this.time.removeAllEvents();

    this.player.setTexture(`char:${c.id}`);
    this.player.setScale(PLAYER_SIZE / Math.max(this.player.frame.width, this.player.frame.height));
    this.hasWalk = this.textures.exists(`char:${c.id}-walk`);

    this.setStatus("playing");
    this.emitHud();
  }

  // ------------------------------------------------------------- main loop
  update(_time: number, deltaMs: number) {
    if (this.status !== "playing") return;
    const dt = Math.min(deltaMs / 1000, 0.1);

    this.elapsed += dt;
    if (this.elapsed >= TIME_LIMIT) {
      this.win();
      return;
    }
    this.score += dt * 6;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.4);
    this.whiteFlash = Math.max(0, this.whiteFlash - dt * 3.5);
    if (this.iframe > 0) this.iframe -= dt;
    if (this.regen > 0 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);

    this.updatePlayer(dt);
    if (this.status !== "playing") return; // died this frame
    this.updateWeapons(dt);
    this.updateBullets(dt);
    this.updateRings(dt);
    this.gcPulse = Math.max(0, this.gcPulse - dt * 4);
    this.updateEnemies(dt);
    this.updatePickups(dt);
    this.updateTexts(dt);
    this.spawn(dt);
    this.draw();

    this.hudTick += dt;
    if (this.hudTick > 0.1) {
      this.hudTick = 0;
      this.emitHud();
    }
  }

  emitHud() {
    this.cb.onHud({
      hp: this.hp,
      maxHp: this.maxHp,
      level: this.level,
      xp: this.xp,
      xpNext: this.xpNext,
      time: this.elapsed,
      kills: this.kills,
      score: Math.floor(this.score),
      weapons: this.weapons.map((w) => ({ id: w.id, level: w.level })),
      passives: (Object.keys(this.passives) as PassiveId[]).map((id) => ({ id, level: this.passives[id]! })),
      boss: this.boss && this.boss.active ? { name: this.boss.def.name, hp: this.boss.hp, maxHp: this.boss.maxHp } : null,
    });
  }

  // ------------------------------------------------------------- player
  updatePlayer(dt: number) {
    let mx = 0;
    let my = 0;
    const k = this.keys;
    if (k.has("a") || k.has("arrowleft")) mx -= 1;
    if (k.has("d") || k.has("arrowright")) mx += 1;
    if (k.has("w") || k.has("arrowup")) my -= 1;
    if (k.has("s") || k.has("arrowdown")) my += 1;
    if (this.touch.active) {
      mx += this.touch.x;
      my += this.touch.y;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    // snappy acceleration for tight controls
    const a = 1 - Math.pow(0.0005, dt);
    this.pvx += (mx * this.speed - this.pvx) * a;
    this.pvy += (my * this.speed - this.pvy) * a;
    this.px += this.pvx * dt;
    this.py += this.pvy * dt;
    const sp = Math.hypot(this.pvx, this.pvy);
    if (sp > 12) {
      this.facing = Math.atan2(this.pvy, this.pvx);
      this.walkT += dt * sp * 0.045;
      if (Math.random() < dt * 14) this.burst(this.px - this.pvx * 0.04, this.py + 14, 1, 0x2c7a8c, 60);
    }

    // contact damage: any enemy body touching the player's circle
    if (this.iframe <= 0) {
      for (const body of this.physics.overlapCirc(this.px, this.py, PLAYER_RADIUS)) {
        const e = body.gameObject;
        if (e instanceof Enemy && e.active) {
          this.damagePlayer(e.def.damage * ENEMY_DAMAGE_MUL);
          break;
        }
      }
    }
  }

  damagePlayer(raw: number) {
    const dmg = raw * (1 - this.armor);
    this.hp -= dmg;
    this.iframe = 0.55;
    this.hurtFlash = 1;
    this.shake(9);
    this.burst(this.px, this.py, 10, 0xff4d6d, 220);
    this.addText(this.px, this.py - 28, "-" + Math.round(dmg), 0xff4d6d, 18, -60, 0.8);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  die() {
    this.whiteFlash = 1;
    this.shake(26);
    this.burst(this.px, this.py, 50, 0xff4d6d, 320);
    this.draw();
    this.endRun(false);
  }

  // survived until TIME_LIMIT
  win() {
    this.elapsed = TIME_LIMIT;
    this.score += 5000;
    this.whiteFlash = 1;
    this.draw();
    this.endRun(true);
  }

  endRun(won: boolean) {
    this.setStatus(won ? "won" : "dead");
    this.emitHud();
    this.cb.onGameOver({
      score: Math.floor(this.score),
      time: this.elapsed,
      kills: this.kills,
      level: this.level,
      won,
      weapons: this.weapons.map((w) => ({ id: w.id, level: w.level })),
      passives: (Object.keys(this.passives) as PassiveId[]).map((id) => ({ id, level: this.passives[id]! })),
    });
  }

  // ------------------------------------------------------------- weapons
  nearestEnemy(x: number, y: number, maxD = 900): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxD * maxD;
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // enemies whose body touches the circle (fast: uses the physics spatial tree)
  enemiesInCircle(x: number, y: number, r: number): Enemy[] {
    const out: Enemy[] = [];
    for (const body of this.physics.overlapCirc(x, y, r)) {
      const e = body.gameObject;
      if (e instanceof Enemy && e.active) out.push(e);
    }
    return out;
  }

  updateWeapons(dt: number) {
    for (const w of this.weapons) {
      w.timer -= dt;
      const L = w.level;
      switch (w.id) {
        case "compiler": {
          if (w.timer > 0) break;
          w.timer = Math.max(0.25, (0.95 - 0.07 * L) * this.cdMul);
          const count = 1 + (L >= 2 ? 1 : 0) + (L >= 4 ? 1 : 0) + (L >= 7 ? 1 : 0);
          const dmg = (9 + 3.5 * L) * this.damageMul;
          const pierce = (L >= 3 ? 1 : 0) + (L >= 6 ? 1 : 0) + (L >= 8 ? 1 : 0);
          const t = this.nearestEnemy(this.px, this.py);
          const base = t ? Math.atan2(t.y - this.py, t.x - this.px) : this.facing;
          for (let i = 0; i < count; i++) {
            this.addBullet(base + (i - (count - 1) / 2) * 0.16, 560, dmg, pierce, "bolt", false, false, hex(WEAPONS.compiler.color));
          }
          this.shake(2);
          break;
        }
        case "duck": {
          const count = duckCount(L);
          const orbR = 92 + (L >= 4 ? 18 : 0);
          w.phase += dt * (2.0 + 0.22 * L);
          const dmg = (7 + 3.5 * L) * this.damageMul * (L >= 4 ? 1.4 : 1);
          const hitR = L >= 4 ? 26 : 20;
          for (let i = 0; i < count; i++) {
            const ang = w.phase + (i / count) * TAU;
            const dx = this.px + Math.cos(ang) * orbR;
            const dy = this.py + Math.sin(ang) * orbR;
            for (const e of this.enemiesInCircle(dx, dy, hitR)) {
              if ((e.hitCd.duck ?? 0) > this.elapsed) continue;
              e.hitCd.duck = this.elapsed + 0.45;
              const a = Math.atan2(e.y - dy, e.x - dx);
              this.hurtEnemy(e, dmg, Math.cos(a) * 540, Math.sin(a) * 540, hex(WEAPONS.duck.color));
            }
          }
          break;
        }
        case "gc": {
          // constant zone around the player: small, frequent hits on everything inside
          // (the Wi-Fi Pulse is the opposite: rare, big expanding waves with knockback)
          if (w.timer > 0) break;
          w.timer = Math.max(0.3, (0.62 - 0.035 * L) * this.cdMul);
          const dmg = (3 + 2.5 * L) * this.damageMul * (L >= 6 ? 1.6 : 1);
          for (const e of this.enemiesInCircle(this.px, this.py, gcRadius(L))) {
            this.hurtEnemy(e, dmg, 0, 0, hex(WEAPONS.gc.color));
            if (L >= 4) e.slow = 0.8;
          }
          this.gcPulse = 1;
          break;
        }
        case "wifi": {
          if (w.timer > 0) break;
          w.timer = Math.max(1.2, (3.2 - 0.2 * L) * this.cdMul);
          const rings = 1 + (L >= 6 ? 1 : 0) + (L >= 8 ? 1 : 0);
          const radius = 180 + 22 * L;
          const dmg = (8 + 5 * L) * this.damageMul;
          for (let i = 0; i < rings; i++) {
            // scene timers pause automatically with the game
            this.time.delayedCall(i * 180, () =>
              this.rings.push({
                x: this.px,
                y: this.py,
                r: 20,
                maxR: radius,
                speed: 420,
                dmg,
                // only the first ring pushes, and gently: with every ring pushing hard
                // enemies could never reach the player at high levels
                knock: i === 0 ? 170 + 15 * L : 0,
                color: hex(WEAPONS.wifi.color),
                width: 10,
                hitSet: new Set(),
              }),
            );
          }
          this.shake(5);
          break;
        }
        case "solder": {
          if (w.timer > 0) break;
          w.timer = Math.max(0.45, (1.35 - 0.1 * L) * this.cdMul);
          const half = 0.55 + 0.07 * L;
          const range = 108 + 11 * L + (L >= 8 ? 30 : 0);
          const dmg = (14 + 6 * L) * this.damageMul * (L >= 4 ? 1.4 : 1);
          const dirs = L >= 6 ? [this.facing, this.facing + Math.PI] : [this.facing];
          for (const d of dirs) {
            this.arcs.push({ ang: d, half, range, life: 0.22, maxLife: 0.22 });
            for (const e of this.enemiesInCircle(this.px, this.py, range)) {
              const diff = Phaser.Math.Angle.Wrap(Math.atan2(e.y - this.py, e.x - this.px) - d);
              if (Math.abs(diff) >= half) continue;
              this.hurtEnemy(e, dmg, (e.x - this.px) * 8, (e.y - this.py) * 8, 0xff7a45);
              if (L >= 4) {
                e.burn = dmg * 0.18;
                e.burnT = 2.2;
              }
            }
          }
          this.shake(3.5);
          break;
        }
        case "drone": {
          if (w.timer > 0) break;
          w.timer = Math.max(0.55, (1.7 - 0.12 * L) * this.cdMul);
          const count = 1 + (L >= 2 ? 1 : 0) + (L >= 4 ? 1 : 0) + (L >= 7 ? 1 : 0) + (L >= 8 ? 1 : 0);
          const dmg = (10 + 3.5 * L) * this.damageMul * (L >= 3 ? 1.2 : 1);
          for (let i = 0; i < count; i++) this.addBullet(rand(0, TAU), 240, dmg, 0, "drone", true, L >= 5, hex(WEAPONS.drone.color));
          break;
        }
      }
    }
  }

  addBullet(ang: number, spd: number, dmg: number, pierce: number, kind: "bolt" | "drone", homing: boolean, explode: boolean, color: number) {
    const b = this.bullets.get(this.px, this.py) as Bullet | null;
    if (!b) return;
    const balloon = kind === "bolt" && this.shotKey !== "bolt";
    const pick = balloon ? Math.floor(Math.random() * this.balloonKeys.length) : -1;
    if (balloon) color = this.balloonColors[pick]; // trail / pop / damage numbers match the balloon
    b.setTexture(balloon ? this.balloonKeys[pick] : kind === "bolt" ? this.shotKey : this.droneKey).setDepth(DEPTH.shots);
    if (balloon) b.setScale(24 / Math.max(b.frame.width, b.frame.height)).setRotation(0); // balloons stay upright
    else if (kind === "bolt") b.setScale(1).setRotation(ang); // glowing bolt points where it flies
    else b.setScale(32 / Math.max(b.frame.width, b.frame.height)).setRotation(0);
    const r = (balloon ? 10 : kind === "bolt" ? 7 : 10) / b.scaleX;
    b.body.setCircle(r, b.frame.width / 2 - r, b.frame.height / 2 - r);
    b.enableBody(true, this.px, this.py, true, true);
    b.body.velocity.set(Math.cos(ang) * spd, Math.sin(ang) * spd);
    b.dmg = dmg;
    b.life = kind === "bolt" ? 1.6 : 3.4;
    b.pierce = pierce;
    b.kind = kind;
    b.homing = homing;
    b.explode = explode;
    b.color = color;
    b.hitSet.clear();
  }

  updateBullets(dt: number) {
    for (const b of this.bullets.getChildren() as Bullet[]) {
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) {
        b.disableBody(true, true);
        continue;
      }
      if (b.homing) {
        const t = this.nearestEnemy(b.x, b.y, 700);
        if (t) {
          const cur = Math.atan2(b.body.velocity.y, b.body.velocity.x);
          const diff = Phaser.Math.Angle.Wrap(Math.atan2(t.y - b.y, t.x - b.x) - cur);
          const ang = cur + Phaser.Math.Clamp(diff, -6 * dt, 6 * dt);
          b.body.velocity.set(Math.cos(ang) * 300, Math.sin(ang) * 300);
        }
      } else if (Math.random() < dt * 40) {
        this.burst(b.x, b.y, 1, b.color, 40);
      }
    }
  }

  bulletHit(b: Bullet, e: Enemy) {
    if (!b.active || !e.active || b.hitSet.has(e)) return;
    b.hitSet.add(e);
    this.hurtEnemy(e, b.dmg, b.body.velocity.x, b.body.velocity.y, b.color);
    if (b.explode) this.explosion(b.x, b.y, 78, b.dmg * 0.5, b.color);
    if (b.pierce > 0) b.pierce--;
    else {
      this.burst(b.x, b.y, 6, b.color);
      b.disableBody(true, true);
    }
  }

  updateRings(dt: number) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += r.speed * dt;
      if (r.r > r.maxR) {
        this.rings.splice(i, 1);
        continue;
      }
      for (const e of this.enemiesInCircle(r.x, r.y, r.r)) {
        if (r.hitSet.has(e)) continue;
        r.hitSet.add(e);
        const a = Math.atan2(e.y - r.y, e.x - r.x);
        this.hurtEnemy(e, r.dmg, Math.cos(a) * r.knock * 6, Math.sin(a) * r.knock * 6, r.color);
      }
    }
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].life -= dt;
      if (this.arcs[i].life <= 0) this.arcs.splice(i, 1);
    }
  }

  explosion(x: number, y: number, radius: number, dmg: number, color: number) {
    for (const e of this.enemiesInCircle(x, y, radius)) this.hurtEnemy(e, dmg, (e.x - x) * 10, (e.y - y) * 10, color);
    this.burst(x, y, 14, color, 260);
    this.shake(6);
  }

  // ------------------------------------------------------------- enemies
  spawnEnemy(def: EnemyDef, x: number, y: number): Enemy | null {
    const e = this.enemies.get(x, y) as Enemy | null;
    if (!e) return null; // pool is full
    e.setTexture(def.boss ? `boss:${def.id}` : `enemy:${def.id}`);
    e.setScale((def.radius * 2.1) / Math.max(e.frame.width, e.frame.height));
    e.setAngle(0).clearTint().setDepth(DEPTH.enemies);
    const r = def.radius / e.scaleX;
    e.body.setCircle(r, e.frame.width / 2 - r, e.frame.height / 2 - r);
    e.enableBody(true, x, y, true, true);
    e.body.pushable = !def.boss; // small enemies can't shove a boss around
    const hp = def.boss ? def.hp * (1 + this.elapsed / 150) : def.hp * (1 + this.elapsed / 68);
    e.def = def;
    e.hp = e.maxHp = hp;
    e.flash = e.slow = e.burn = e.burnT = e.kx = e.ky = 0;
    e.wob = Math.random() * TAU;
    e.hitCd = {};
    return e;
  }

  hurtEnemy(e: Enemy, dmg: number, kx: number, ky: number, color: number) {
    e.hp -= dmg;
    e.flash = 0.12;
    const kmul = e.def.boss ? 0.06 : 0.22;
    e.kx += kx * kmul;
    e.ky += ky * kmul;
    this.addText(e.x + rand(-6, 6), e.y - e.def.radius, String(Math.round(dmg)), color, dmg > 60 ? 20 : 14);
    if (e.hp <= 0) this.killEnemy(e);
    else this.burst(e.x, e.y, 3, color, 120);
  }

  killEnemy(e: Enemy) {
    const def = e.def;
    const { x, y } = e;
    e.disableBody(true, true);
    this.kills++;
    this.score += def.score;
    this.burst(x, y, def.boss ? 60 : 10, hex(def.color), def.boss ? 420 : 200);
    if (def.boss) {
      this.shake(22);
      this.whiteFlash = 1;
      this.boss = null;
      for (let i = 0; i < 12; i++) this.dropPickup(x + rand(-60, 60), y + rand(-60, 60), "xp", Math.ceil(def.xp / 12));
      this.dropPickup(x, y, "heal", 40);
      this.dropPickup(x + 40, y, "nuke", 0);
    } else {
      this.shake(2.5);
      this.dropPickup(x, y, "xp", def.xp);
      const roll = Math.random();
      if (roll < 0.012) this.dropPickup(x, y, "heal", 22);
      else if (roll < 0.02) this.dropPickup(x, y, "magnet", 0);
      else if (roll < 0.02 + NUKE_DROP_CHANCE) this.dropPickup(x, y, "nuke", 0);
    }
    for (let i = 0; i < (def.splits ?? 0); i++) {
      const b = this.spawnEnemy(ENEMIES[0], x + rand(-20, 20), y + rand(-20, 20));
      if (b) b.hp = b.maxHp = b.maxHp * 0.6;
    }
  }

  updateEnemies(dt: number) {
    const speedScale = 1 + this.elapsed / 480;
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.slow > 0) e.slow -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.hp -= e.burn * dt * 3;
        if (Math.random() < dt * 8) this.burst(e.x, e.y, 1, 0xff7a45, 40);
        if (e.hp <= 0) {
          this.killEnemy(e);
          continue;
        }
      }
      // chase the player (+ knockback that fades out)
      const dx = this.px - e.x;
      const dy = this.py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = e.def.speed * (e.slow > 0 ? 0.45 : 1) * speedScale;
      e.kx *= decay(0.86, dt);
      e.ky *= decay(0.86, dt);
      e.body.velocity.set((dx / d) * sp + e.kx, (dy / d) * sp + e.ky);

      // small waddle + white flash when hit
      e.wob += dt * 6;
      e.setAngle(Math.sin(e.wob) * (e.def.boss ? 3 : 7));
      if (e.flash > 0) e.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else if (e.tintMode !== Phaser.TintModes.MULTIPLY) e.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    }
  }

  spawn(dt: number) {
    const W = this.scale.width;
    const H = this.scale.height;
    this.bossTimer -= dt;
    if (this.bossTimer <= 0 && !this.boss) {
      const def = BOSSES[this.bossIndex % BOSSES.length]; // bosses take turns: exam, thesis, exam, ...
      this.bossIndex++;
      this.bossTimer = 95;
      const a = Math.random() * TAU;
      const dist = Math.max(W, H) * 0.65;
      this.boss = this.spawnEnemy(def, this.px + Math.cos(a) * dist, this.py + Math.sin(a) * dist);
      this.shake(16);
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const wave = this.elapsed / 60;
    this.spawnTimer = Math.max(0.16, 0.8 - wave * 0.1);
    const count = 2 + Math.floor(wave * 1.8);
    const pool = ENEMIES.filter((e) => this.elapsed >= e.minTime);
    const total = pool.reduce((s, e) => s + e.weight, 0);
    const rx = W * 0.5 + 60;
    const ry = H * 0.5 + 60;
    const clusterAng = Math.random() * TAU;
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total;
      let def = pool[0];
      for (const e of pool) {
        r -= e.weight;
        if (r <= 0) {
          def = e;
          break;
        }
      }
      // spawn just outside the screen edge
      const a = clusterAng + rand(-0.55, 0.55);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const s = Math.min(rx / (Math.abs(ca) + 1e-4), ry / (Math.abs(sa) + 1e-4)) * rand(1.0, 1.1);
      if (!this.spawnEnemy(def, this.px + ca * s, this.py + sa * s)) break;
    }
  }

  // ------------------------------------------------------------- pickups
  dropPickup(x: number, y: number, kind: Pickup["kind"], value: number) {
    const key = kind === "xp" ? this.xpKey : `pickup:${kind}`;
    const p = this.pickups.get(x, y, key) as Pickup | null;
    if (!p) return;
    p.setTexture(key).setActive(true).setVisible(true).setDepth(DEPTH.pickups);
    // the generated glow orb needs 32px (mostly glow); a custom xp.png is drawn at 16px
    const size = kind === "xp" ? (this.xpKey === "xp" ? 32 : 16) : 30;
    p.setScale(size / Math.max(p.frame.width, p.frame.height));
    p.kind = kind;
    p.value = value;
    p.wx = x;
    p.wy = y;
    p.vx = rand(-40, 40);
    p.vy = rand(-40, 40);
    p.t = Math.random() * 6;
  }

  updatePickups(dt: number) {
    const pr = this.pickupRadius;
    for (const p of this.pickups.getChildren() as Pickup[]) {
      if (!p.active) continue;
      p.t += dt;
      p.vx *= decay(0.9, dt);
      p.vy *= decay(0.9, dt);
      const dx = this.px - p.wx;
      const dy = this.py - p.wy;
      const d = Math.hypot(dx, dy) || 1;
      if (d < pr) {
        const pull = 420 * (1 - d / pr) + 130;
        p.vx += (dx / d) * pull * dt * 6;
        p.vy += (dy / d) * pull * dt * 6;
      }
      p.wx += p.vx * dt;
      p.wy += p.vy * dt;
      p.setPosition(p.wx, p.wy + Math.sin(p.t * 4) * 3);
      if (d < 24) {
        p.setActive(false).setVisible(false);
        this.collect(p);
      }
    }
  }

  collect(p: Pickup) {
    if (p.kind === "xp") {
      this.xp += p.value * this.xpMul;
      this.score += p.value * 2;
      while (this.xp >= this.xpNext) {
        this.xp -= this.xpNext;
        this.levelUp();
      }
    } else if (p.kind === "heal") {
      this.hp = Math.min(this.maxHp, this.hp + p.value);
      this.addText(this.px, this.py - 30, `+${p.value} HP`, 0x7cff9b, 18, -60, 0.9);
    } else if (p.kind === "magnet") {
      for (const q of this.pickups.getChildren() as Pickup[]) {
        if (!q.active || q.kind !== "xp") continue;
        const a = Math.atan2(this.py - q.wy, this.px - q.wx);
        q.vx = Math.cos(a) * 900;
        q.vy = Math.sin(a) * 900;
      }
      this.addText(this.px, this.py - 30, "git pull", 0xff6fd8, 18, -60, 0.9);
    } else {
      this.whiteFlash = 1;
      this.shake(18);
      for (const e of this.enemies.getChildren() as Enemy[]) if (e.active && !e.def.boss) this.hurtEnemy(e, 10000, 0, 0, 0xffffff);
      this.addText(this.px, this.py - 30, "rm -rf *", 0xffd84d, 24, -60, 1.2);
    }
  }

  // ------------------------------------------------------------- level up
  levelUp() {
    this.level++;
    this.xpNext = xpForLevel(this.level);
    this.score += 120;
    this.whiteFlash = 0.6;
    this.burst(this.px, this.py, 28, 0xffd84d, 300);
    this.draw();
    this.cb.onLevelUp(this.rollUpgrades());
    this.setStatus("levelup");
    this.emitHud();
  }

  rollUpgrades(): UpgradeOption[] {
    const pool: UpgradeOption[] = [];
    for (const w of this.weapons) {
      const def = WEAPONS[w.id];
      if (w.level < def.maxLevel)
        pool.push({ key: "w:" + w.id, kind: "weapon", id: w.id, name: def.name, icon: def.icon, color: def.color, desc: def.levelDesc[w.level] ?? def.desc, level: w.level + 1, isNew: false });
    }
    if (this.weapons.length < MAX_WEAPONS) {
      for (const id of Object.keys(WEAPONS) as WeaponId[]) {
        if (this.weapons.some((w) => w.id === id)) continue;
        const def = WEAPONS[id];
        pool.push({ key: "w:" + id, kind: "weapon", id, name: def.name, icon: def.icon, color: def.color, desc: def.desc, level: 1, isNew: true });
      }
    }
    for (const id of Object.keys(PASSIVES) as PassiveId[]) {
      const def = PASSIVES[id];
      const lv = this.passives[id] ?? 0;
      if (lv >= def.maxLevel) continue;
      if (lv === 0 && Object.keys(this.passives).length >= MAX_PASSIVES) continue; // no new passives past the cap
      pool.push({ key: "p:" + id, kind: "passive", id, name: def.name, icon: def.icon, color: def.color, desc: def.desc, level: lv + 1, isNew: lv === 0 });
    }
    const out: UpgradeOption[] = [];
    for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    while (out.length < 3) {
      out.push({ key: "heal" + out.length, kind: "heal", id: "heal", name: "Free Pizza", icon: "🍕", color: "#7cff9b", desc: "Restore 40 HP and gain 250 score.", level: 1, isNew: false });
    }
    return out;
  }

  applyUpgrade(o: UpgradeOption) {
    if (o.kind === "weapon") {
      const existing = this.weapons.find((w) => w.id === o.id);
      if (existing) existing.level++;
      else this.weapons.push({ id: o.id as WeaponId, level: 1, timer: 0.2, phase: 0 });
    } else if (o.kind === "passive") {
      const id = o.id as PassiveId;
      const lv = (this.passives[id] = (this.passives[id] ?? 0) + 1);
      switch (id) {
        case "espresso":
          this.speed = this.char.speed * (1 + 0.08 * lv);
          break;
        case "ram":
          this.maxHp += 15;
          this.hp += 15;
          this.regen = 0.4 * lv;
          break;
        case "overclock":
          this.cdMul = Math.pow(0.94, lv);
          break;
        case "bigO":
          this.damageMul = this.char.damageMul * (1 + 0.1 * lv);
          break;
        case "magnet":
          this.pickupRadius = this.char.pickupRadius * (1 + 0.25 * lv);
          break;
        case "notes":
          this.xpMul = this.char.xpMul * (1 + 0.12 * lv);
          break;
        case "thermal":
          this.armor = 1 - Math.pow(0.95, lv);
          break;
      }
    } else {
      this.hp = Math.min(this.maxHp, this.hp + 40);
      this.score += 250;
    }
    this.setStatus("playing");
    this.emitHud();
  }

  // ------------------------------------------------------------- effects
  burst(x: number, y: number, n: number, color: number, spd = 160) {
    this.burstColor = color;
    this.burstSpeed = spd;
    this.sparks.explode(n, x, y);
  }

  shake(px: number) {
    // big shakes interrupt small ones; small ones don't interrupt anything
    this.cameras.main.shake(px >= 9 ? 260 : 120, px / Math.max(this.scale.width, 1), px >= 9);
  }

  // floating numbers / messages, reusing a pool of BitmapTexts
  addText(x: number, y: number, text: string, color: number, size: number, vy = -46, life = 0.6) {
    let t = this.texts.find((t) => t.life <= 0);
    if (!t) {
      if (this.texts.length >= 40) return;
      t = { obj: this.add.bitmapText(0, 0, "font", "").setOrigin(0.5).setDepth(DEPTH.text), life: 0, maxLife: 1, vy: 0 };
      this.texts.push(t);
    }
    t.obj.setText(text).setFontSize(size * 1.2).setTint(color).setPosition(x, y).setAlpha(1).setVisible(true);
    t.life = t.maxLife = life;
    t.vy = vy;
  }

  updateTexts(dt: number) {
    for (const t of this.texts) {
      if (t.life <= 0) continue;
      t.life -= dt;
      t.vy *= decay(0.92, dt);
      t.obj.y += t.vy * dt;
      t.obj.setAlpha(Math.min(1, t.life * 1.6));
      if (t.life <= 0) t.obj.setVisible(false);
    }
  }

  // ------------------------------------------------------------- drawing
  // Sprites draw themselves; this only positions things and redraws the
  // few shapes (shadows, rings, health bars) into two Graphics objects.
  draw() {
    const cam = this.cameras.main;
    const W = this.scale.width;
    const H = this.scale.height;
    cam.centerOn(this.px, this.py);

    // floor: a screen-sized TileSprite snapped to the tile grid
    const T = this.tile;
    this.floor.setPosition(Math.floor(cam.scrollX / T) * T, Math.floor(cam.scrollY / T) * T);
    if (this.floor.width !== W + T || this.floor.height !== H + T) this.floor.setSize(W + T, H + T);

    // view rectangle (with margin) to skip off-screen shapes
    const vx0 = cam.scrollX - 80;
    const vy0 = cam.scrollY - 80;
    const vx1 = cam.scrollX + W + 80;
    const vy1 = cam.scrollY + H + 80;

    const u = this.under.clear();
    const o = this.over.clear();

    // player glow ring + shadow
    u.fillStyle(0x000000, 0.4).fillEllipse(this.px, this.py + 18, 28, 10);
    u.lineStyle(2, hex(this.char.color), 0.35 + Math.sin(this.elapsed * 4) * 0.1).strokeCircle(this.px, this.py, 22);

    // enemies: shadow below, health bar / boss ring above
    u.fillStyle(0x000000, 0.35);
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
      const r = e.def.radius;
      u.fillEllipse(e.x, e.y + r * 0.85, r * 1.4, r * 0.52);
      if (e.def.boss) {
        o.lineStyle(3, hex(e.def.color), 0.5).strokeCircle(e.x, e.y, r + 8 + Math.sin(this.elapsed * 6) * 3);
      } else if (e.hp < e.maxHp) {
        const w = r * 1.8;
        o.fillStyle(0x000000, 0.5).fillRect(e.x - w / 2, e.y - r - 10, w, 4);
        o.fillStyle(hex(e.def.color), 1).fillRect(e.x - w / 2, e.y - r - 10, (w * Math.max(0, e.hp)) / e.maxHp, 4);
      }
    }

    // expanding rings: wide faint stroke + thin bright stroke = cheap glow
    for (const r of this.rings) {
      const a = Phaser.Math.Clamp(1 - r.r / r.maxR, 0, 1) * 0.9;
      u.lineStyle(r.width * 2.2, r.color, a * 0.25).strokeCircle(r.x, r.y, r.r);
      u.lineStyle(r.width, r.color, a).strokeCircle(r.x, r.y, r.r);
    }

    // soldering arcs: 3 stacked slices fake a hot-center gradient
    for (const a of this.arcs) {
      const k = a.life / a.maxLife;
      const h = a.half * (0.5 + k * 0.5);
      u.fillStyle(0xff5a28, k * 0.16).slice(this.px, this.py, a.range, a.ang - h, a.ang + h).fillPath();
      u.fillStyle(0xff8c46, k * 0.22).slice(this.px, this.py, a.range * 0.7, a.ang - h, a.ang + h).fillPath();
      u.fillStyle(0xffdc78, k * 0.35).slice(this.px, this.py, a.range * 0.4, a.ang - h, a.ang + h).fillPath();
    }

    // garbage collector aura: dashed circle, redrawn only when its level changes
    const gc = this.weapons.find((w) => w.id === "gc");
    const gcLevel = gc ? gc.level : 0;
    if (gcLevel !== this.auraLevel) {
      this.auraLevel = gcLevel;
      this.aura.clear();
      if (gc) {
        const radius = gcRadius(gc.level);
        const dash = 8 / radius;
        const gap = 10 / radius;
        this.aura.lineStyle(2, 0x7cff9b, 0.5);
        for (let a = 0; a < TAU; a += dash + gap) {
          this.aura.beginPath().arc(0, 0, radius, a, a + dash).strokePath();
        }
      }
    }
    // the zone glows briefly on every tick
    this.aura.setPosition(this.px, this.py).setAlpha(0.36 + 0.64 * this.gcPulse);
    if (gc && this.gcPulse > 0) u.fillStyle(0x7cff9b, 0.07 * this.gcPulse).fillCircle(this.px, this.py, gcRadius(gc.level));

    // orbiting algorithm books
    const duck = this.weapons.find((w) => w.id === "duck");
    const ducks = duck ? duckCount(duck.level) : 0;
    for (let i = 0; i < this.duckImgs.length; i++) {
      const img = this.duckImgs[i];
      if (!duck || i >= ducks) {
        img.setVisible(false);
        continue;
      }
      const ang = duck.phase + (i / ducks) * TAU;
      const orbR = 92 + (duck.level >= 4 ? 18 : 0);
      const size = duck.level >= 4 ? 46 : 36;
      img.setVisible(true).setScale(size / Math.max(img.frame.width, img.frame.height));
      img.setPosition(this.px + Math.cos(ang) * orbR, this.py + Math.sin(ang) * orbR);
    }

    // player: walk frame, bob, face the movement direction, blink while invulnerable
    const moving = Math.hypot(this.pvx, this.pvy) > 12;
    const walkFrame = this.hasWalk && moving && Math.sin(this.walkT) > 0;
    const key = walkFrame ? `char:${this.char.id}-walk` : `char:${this.char.id}`;
    if (this.player.texture.key !== key) this.player.setTexture(key);
    this.player.setPosition(this.px, this.py - 3 + Math.sin(this.walkT) * 4);
    this.player.setFlipX(Math.cos(this.facing) < 0);
    this.player.setAlpha(this.iframe > 0 && Math.floor(this.iframe * 20) % 2 === 0 ? 0.4 : 1);

    // screen flashes
    this.hurtRect.setSize(W, H).setAlpha(this.hurtFlash * 0.3);
    this.whiteRect.setSize(W, H).setAlpha(this.whiteFlash * 0.45);
  }
}
