import Phaser from "phaser";
import {
  ENEMY_DAMAGE_MUL,
  FLOOR_DIM,
  FLOOR_TILE_SIZE,
  MAX_PASSIVES,
  MAX_WEAPONS,
  TIME_LIMIT,
  xpForLevel,
  type CharacterDef,
  type EnemyDef,
  type GameData,
  type PassiveDef,
  type PickupKind,
  type WeaponDef,
  type WeaponEffect,
} from "./content";
import { FLOOR_URL, NO_ART } from "./sprites";
import { GameAudio, loadAudio } from "./audio";
import { createGeneratedTextures, hueVariants } from "./textures";

const TAU = Math.PI * 2;
const rand = Phaser.Math.FloatBetween;
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

const DEPTH = { floor: 0, pickups: 1, under: 2, enemies: 3, over: 4, shots: 5, player: 6, particles: 7, text: 8, flash: 9 };

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNext: number;
  time: number;
  kills: number;
  score: number;
  weapons: { id: string; level: number }[];
  passives: { id: string; level: number }[];
  boss: { name: string; hp: number; maxHp: number } | null;
}

export interface UpgradeOption {
  key: string;
  kind: "weapon" | "passive" | "heal";
  id: string;
  name: string;
  image: string | null;
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
  weapons: { id: string; level: number }[];
  passives: { id: string; level: number }[];
}

export interface Callbacks {
  onHud: (h: HudSnapshot) => void;
  onStatus: (s: GameStatus) => void;
  onLevelUp: (opts: UpgradeOption[]) => void;
  onGameOver: (result: RunResult) => void;
}

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
  effect: WeaponEffect | null = null;
  color = 0xffffff;
  hitSet = new Set<Enemy>();
}

class Pickup extends Phaser.GameObjects.Image {
  kind: PickupKind = "xp";
  value = 0;
  t = 0;
  vx = 0;
  vy = 0;
  wx = 0;
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
  effect: WeaponEffect | null;
  hitSet: Set<Enemy>;
}

interface Arc {
  ang: number;
  half: number;
  range: number;
  life: number;
  maxLife: number;
  color: number;
}

interface FloatText {
  obj: Phaser.GameObjects.BitmapText;
  life: number;
  maxLife: number;
  vy: number;
}

interface WeaponState {
  def: WeaponDef;
  level: number;
  timer: number;
  phase: number;
  pulse: number;
  drawn: number;
}

const newWeapon = (def: WeaponDef, timer: number): WeaponState => ({ def, level: 1, timer, phase: 0, pulse: 0, drawn: 0 });
const stats = (w: WeaponState) => w.def.levels[w.level - 1];

export class GameScene extends Phaser.Scene {
  cb: Callbacks;
  catalog: GameData;
  weaponDefs: Map<string, WeaponDef>;
  bonus = { attack: 0, defense: 0, health: 0, movementSpeed: 1, attackSpeed: 1, projectileSpeed: 1, projectileSize: 1, regeneration: 0 };
  passiveDefs: Map<string, PassiveDef>;
  audio!: GameAudio;
  status: GameStatus = "menu";
  ready = false;
  pendingStart: string | null = null;

  keys = new Set<string>();
  touch = { x: 0, y: 0, active: false };

  char: CharacterDef;

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

  level = 1;
  xp = 0;
  xpNext = 6;
  kills = 0;
  score = 0;
  elapsed = 0;
  weapons: WeaponState[] = [];
  passives: Record<string, number> = {};
  spawnTimer = 0;
  bossTimer = 70;
  bossIndex = 0;
  boss: Enemy | null = null;
  hudTick = 0;

  rings: Ring[] = [];
  arcs: Arc[] = [];
  texts: FloatText[] = [];
  hurtFlash = 0;
  whiteFlash = 0;
  burstColor = 0xffffff;
  burstSpeed = 160;

  floor!: Phaser.GameObjects.TileSprite;
  tile = FLOOR_TILE_SIZE;
  player!: Phaser.GameObjects.Sprite;
  hasWalk = false;
  enemies!: Phaser.Physics.Arcade.Group;
  bullets!: Phaser.Physics.Arcade.Group;
  pickups!: Phaser.GameObjects.Group;
  orbitImgs = new Map<string, Phaser.GameObjects.Image[]>();
  auraGfx = new Map<string, Phaser.GameObjects.Graphics>();
  under!: Phaser.GameObjects.Graphics;
  over!: Phaser.GameObjects.Graphics;
  sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  hurtRect!: Phaser.GameObjects.Rectangle;
  whiteRect!: Phaser.GameObjects.Rectangle;
  xpKey = "xp";
  shotKeys = new Map<string, { keys: string[]; colors: number[] }>();
  droneKeys = new Map<string, string>();

  constructor(cb: Callbacks, catalog: GameData) {
    super("game");
    this.cb = cb;
    this.catalog = catalog;
    this.char = catalog.characters[0];
    this.weaponDefs = new Map(catalog.weapons.map((w) => [w.id, w]));
    this.passiveDefs = new Map(catalog.passiveItems.map((p) => [p.id, p]));
    for (const p of catalog.powerUps) {
      this.bonus.attack += p.attack;
      this.bonus.defense += p.defense;
      this.bonus.health += p.health;
      this.bonus.movementSpeed *= p.movementSpeed;
      this.bonus.attackSpeed *= p.attackSpeed;
      this.bonus.projectileSpeed *= p.projectileSpeed;
      this.bonus.projectileSize *= p.projectileSize;
      this.bonus.regeneration += p.regeneration;
    }
  }

  preload() {
    const image = (key: string, url: string | null) => {
      if (url) this.load.image(key, url);
    };
    this.load.svg("no-art", NO_ART, { scale: 2 });
    for (const c of this.catalog.characters) {
      image(`char:${c.id}`, c.spriteUrl);
      image(`char:${c.id}-walk`, c.walkSpriteUrl);
    }
    for (const e of this.catalog.enemies) image(`enemy:${e.id}`, e.imageUrl);
    for (const b of this.catalog.bosses) image(`boss:${b.id}`, b.imageUrl);
    for (const w of this.catalog.weapons) {
      image(`weapon:${w.id}`, w.imageUrl);
      image(`shot:${w.id}`, w.shotImageUrl);
    }
    for (const p of this.catalog.pickups) image(`pickup:${p.id}`, p.imageUrl);
    this.load.image("floor", FLOOR_URL);
    loadAudio(this);
  }

  noArt(key: string) {
    if (!this.textures.exists(key)) this.textures.addImage(key, this.textures.get("no-art").getSourceImage() as HTMLImageElement);
  }

  create() {
    createGeneratedTextures(this);
    this.audio = new GameAudio(this);

    for (const c of this.catalog.characters) this.noArt(`char:${c.id}`);
    for (const e of this.catalog.enemies) this.noArt(`enemy:${e.id}`);
    for (const b of this.catalog.bosses) this.noArt(`boss:${b.id}`);
    if (this.textures.exists("pickup:xp")) this.xpKey = "pickup:xp";
    for (const p of this.catalog.pickups) if (p.id !== "xp") this.noArt(`pickup:${p.id}`);
    for (const w of this.catalog.weapons) {
      const shot = `shot:${w.id}`;
      const hasShot = this.textures.exists(shot);
      if (w.behavior === "projectile" && hasShot) this.shotKeys.set(w.id, hueVariants(this, shot, 6, hex(w.color)));
      if (w.behavior === "drone") this.droneKeys.set(w.id, hasShot ? shot : "bolt");
      this.noArt(`weapon:${w.id}`);
    }

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
    this.over = this.add.graphics().setDepth(DEPTH.over);
    this.player = this.add.sprite(0, 0, `char:${this.char.id}`).setDepth(DEPTH.player);
    for (const w of this.catalog.weapons) {
      if (w.behavior === "aura") this.auraGfx.set(w.id, this.add.graphics().setDepth(DEPTH.under));
      if (w.behavior !== "orbit") continue;
      const max = Math.max(...w.levels.map((l) => l.count));
      this.orbitImgs.set(
        w.id,
        Array.from({ length: max }, () => this.add.image(0, 0, `weapon:${w.id}`).setDepth(DEPTH.shots).setVisible(false)),
      );
    }

    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: MAX_ENEMIES });
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 200 });
    this.pickups = this.add.group({ classType: Pickup, maxSize: 420 });

    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.bulletHit(b as unknown as Bullet, e as unknown as Enemy));

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

    this.hurtRect = this.add.rectangle(0, 0, 1, 1, 0xff2850).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.flash).setAlpha(0);
    this.whiteRect = this.add.rectangle(0, 0, 1, 1, 0xffffff).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.flash).setAlpha(0);

    this.ready = true;
    if (this.pendingStart) this.startRun(this.pendingStart);
    else this.setStatus(this.status);
    this.draw();
  }

  setStatus(s: GameStatus) {
    this.status = s;
    if (this.ready) {
      const run = s === "playing";
      if (run) this.physics.world.resume();
      else this.physics.world.pause();
      this.time.paused = !run;
      if (run) this.sparks.resume();
      else this.sparks.pause();
      if (run) this.audio.setMusicLevel("full");
      else if (s === "paused" || s === "levelup") this.audio.setMusicLevel("low");
      else this.audio.setMusicLevel("off");
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
    const c = this.catalog.characters.find((x) => x.id === charId) ?? this.catalog.characters[0];
    this.char = c;
    this.px = this.py = this.pvx = this.pvy = 0;
    this.maxHp = this.hp = c.hp + this.bonus.health;
    this.iframe = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpForLevel(1);
    this.kills = 0;
    this.score = 0;
    this.elapsed = 0;
    this.weapons = [newWeapon(this.weaponDefs.get(c.initialWeaponId) ?? this.catalog.weapons[0], 0.25)];
    this.passives = {};
    this.applyPassives();
    this.spawnTimer = 0;
    this.bossTimer = 70;
    this.bossIndex = 0;
    this.boss = null;
    this.rings = [];
    this.arcs = [];
    this.hurtFlash = this.whiteFlash = 0;
    for (const g of this.auraGfx.values()) g.clear();

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

    this.audio.startMusic();
    this.setStatus("playing");
    this.emitHud();
  }

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
    if (this.status !== "playing") return;
    this.updateWeapons(dt);
    this.updateBullets(dt);
    this.updateRings(dt);
    for (const w of this.weapons) w.pulse = Math.max(0, w.pulse - dt * 4);
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
      weapons: this.weapons.map((w) => ({ id: w.def.id, level: w.level })),
      passives: Object.entries(this.passives).map(([id, level]) => ({ id, level })),
      boss: this.boss && this.boss.active ? { name: this.boss.def.name, hp: this.boss.hp, maxHp: this.boss.maxHp } : null,
    });
  }

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
    const dmg = Math.max(1, raw * (1 - this.armor) - this.bonus.defense);
    this.hp -= dmg;
    this.iframe = 0.55;
    this.hurtFlash = 1;
    this.shake(9);
    this.burst(this.px, this.py, 10, 0xff4d6d, 220);
    this.addText(this.px, this.py - 28, "-" + Math.round(dmg), 0xff4d6d, 18, -60, 0.8);
    this.audio.play("hurt");
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  die() {
    this.audio.play("gameover");
    this.whiteFlash = 1;
    this.shake(26);
    this.burst(this.px, this.py, 50, 0xff4d6d, 320);
    this.draw();
    this.endRun(false);
  }

  win() {
    this.audio.play("win");
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
      weapons: this.weapons.map((w) => ({ id: w.def.id, level: w.level })),
      passives: Object.entries(this.passives).map(([id, level]) => ({ id, level })),
    });
  }

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
      const def = w.def;
      const s = stats(w);
      const color = hex(def.color);
      const dmg = s.damage * this.damageMul + this.bonus.attack;
      if (def.behavior === "orbit") {
        w.phase += dt * s.speed;
        for (let i = 0; i < s.count; i++) {
          const ang = w.phase + (i / s.count) * TAU;
          const dx = this.px + Math.cos(ang) * s.area;
          const dy = this.py + Math.sin(ang) * s.area;
          for (const e of this.enemiesInCircle(dx, dy, s.size)) {
            if ((e.hitCd[def.id] ?? 0) > this.elapsed) continue;
            e.hitCd[def.id] = this.elapsed + s.cooldown;
            const a = Math.atan2(e.y - dy, e.x - dx);
            this.weaponHit(e, dmg, Math.cos(a) * s.knockback, Math.sin(a) * s.knockback, color, s.effect);
          }
        }
        continue;
      }
      if (w.timer > 0) continue;
      w.timer = Math.max(def.minCooldown, s.cooldown * this.cdMul);
      switch (def.behavior) {
        case "projectile": {
          const t = this.nearestEnemy(this.px, this.py);
          const base = t ? Math.atan2(t.y - this.py, t.x - this.px) : this.facing;
          for (let i = 0; i < s.count; i++) {
            this.addBullet(def.id, base + (i - (s.count - 1) / 2) * 0.16, s.speed, dmg, s.pierce, "bolt", s.effect, color);
          }
          this.audio.play("shoot");
          this.shake(2);
          break;
        }
        case "aura": {
          for (const e of this.enemiesInCircle(this.px, this.py, s.area)) this.weaponHit(e, dmg, 0, 0, color, s.effect);
          w.pulse = 1;
          break;
        }
        case "pulse": {
          this.audio.play("wave");
          for (let i = 0; i < s.count; i++) {
            this.time.delayedCall(i * 180, () =>
              this.rings.push({
                x: this.px,
                y: this.py,
                r: 20,
                maxR: s.area,
                speed: s.speed,
                dmg,
                knock: i === 0 ? s.knockback : 0,
                color,
                width: s.size,
                effect: s.effect,
                hitSet: new Set(),
              }),
            );
          }
          this.shake(5);
          break;
        }
        case "melee": {
          const dirs = s.count >= 2 ? [this.facing, this.facing + Math.PI] : [this.facing];
          this.audio.play("swish");
          for (const d of dirs) {
            this.arcs.push({ ang: d, half: s.size, range: s.area, life: 0.22, maxLife: 0.22, color });
            for (const e of this.enemiesInCircle(this.px, this.py, s.area)) {
              const diff = Phaser.Math.Angle.Wrap(Math.atan2(e.y - this.py, e.x - this.px) - d);
              if (Math.abs(diff) >= s.size) continue;
              this.weaponHit(e, dmg, (e.x - this.px) * s.knockback, (e.y - this.py) * s.knockback, color, s.effect);
            }
          }
          this.shake(3.5);
          break;
        }
        case "drone": {
          for (let i = 0; i < s.count; i++) this.addBullet(def.id, rand(0, TAU), s.speed, dmg, s.pierce, "drone", s.effect, color);
          this.audio.play("shoot", -500);
          break;
        }
      }
    }
  }

  weaponHit(e: Enemy, dmg: number, kx: number, ky: number, color: number, effect: WeaponEffect | null) {
    if (effect === "slow") e.slow = 0.8;
    if (effect === "burn") {
      e.burn = dmg * 0.18;
      e.burnT = 2.2;
    }
    this.hurtEnemy(e, dmg, kx, ky, color);
  }

  addBullet(weaponId: string, ang: number, spd: number, dmg: number, pierce: number, kind: "bolt" | "drone", effect: WeaponEffect | null, color: number) {
    const b = this.bullets.get(this.px, this.py) as Bullet | null;
    if (!b) return;
    const shots = kind === "bolt" ? this.shotKeys.get(weaponId) : undefined;
    const pick = shots ? Math.floor(Math.random() * shots.keys.length) : -1;
    if (shots) color = shots.colors[pick];
    b.setTexture(shots ? shots.keys[pick] : kind === "bolt" ? "bolt" : this.droneKeys.get(weaponId)!).setDepth(DEPTH.shots);
    const size = this.bonus.projectileSize;
    if (shots) b.setScale((24 * size) / Math.max(b.frame.width, b.frame.height)).setRotation(0);
    else if (kind === "bolt") b.setScale(size).setRotation(ang);
    else b.setScale((32 * size) / Math.max(b.frame.width, b.frame.height)).setRotation(0);
    const r = ((shots ? 10 : kind === "bolt" ? 7 : 10) * size) / b.scaleX;
    b.body.setCircle(r, b.frame.width / 2 - r, b.frame.height / 2 - r);
    b.enableBody(true, this.px, this.py, true, true);
    spd *= this.bonus.projectileSpeed;
    b.body.velocity.set(Math.cos(ang) * spd, Math.sin(ang) * spd);
    b.dmg = dmg;
    b.life = kind === "bolt" ? 1.6 : 3.4;
    b.pierce = pierce;
    b.kind = kind;
    b.homing = kind === "drone";
    b.effect = effect;
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
          const spd = 300 * this.bonus.projectileSpeed;
          b.body.velocity.set(Math.cos(ang) * spd, Math.sin(ang) * spd);
        }
      } else if (Math.random() < dt * 40) {
        this.burst(b.x, b.y, 1, b.color, 40);
      }
    }
  }

  bulletHit(b: Bullet, e: Enemy) {
    if (!b.active || !e.active || b.hitSet.has(e)) return;
    b.hitSet.add(e);
    this.weaponHit(e, b.dmg, b.body.velocity.x, b.body.velocity.y, b.color, b.effect);
    if (b.effect === "explode") this.explosion(b.x, b.y, 78, b.dmg * 0.5, b.color);
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
        this.weaponHit(e, r.dmg, Math.cos(a) * r.knock * 6, Math.sin(a) * r.knock * 6, r.color, r.effect);
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

  spawnEnemy(def: EnemyDef, x: number, y: number): Enemy | null {
    const e = this.enemies.get(x, y) as Enemy | null;
    if (!e) return null;
    e.setTexture(def.boss ? `boss:${def.id}` : `enemy:${def.id}`);
    e.setScale((def.radius * 2.1) / Math.max(e.frame.width, e.frame.height));
    e.setAngle(0).clearTint().setDepth(DEPTH.enemies);
    const r = def.radius / e.scaleX;
    e.body.setCircle(r, e.frame.width / 2 - r, e.frame.height / 2 - r);
    e.enableBody(true, x, y, true, true);
    e.body.pushable = !def.boss;
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
    this.audio.play(def.boss ? "nuke" : "pop", def.boss ? 0 : rand(-150, 150));
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
      let roll = Math.random();
      for (const p of this.catalog.pickups) {
        if (p.id === "xp") continue;
        if (roll < p.dropChance) {
          this.dropPickup(x, y, p.id, p.value);
          break;
        }
        roll -= p.dropChance;
      }
    }
    for (let i = 0; i < (def.splits ?? 0); i++) {
      const b = this.spawnEnemy(this.catalog.enemies[0], x + rand(-20, 20), y + rand(-20, 20));
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
      const dx = this.px - e.x;
      const dy = this.py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = e.def.speed * (e.slow > 0 ? 0.45 : 1) * speedScale;
      e.kx *= decay(0.86, dt);
      e.ky *= decay(0.86, dt);
      e.body.velocity.set((dx / d) * sp + e.kx, (dy / d) * sp + e.ky);

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
      const bosses = this.catalog.bosses;
      const def = bosses[this.bossIndex % bosses.length];
      this.bossIndex++;
      this.bossTimer = 95;
      const a = Math.random() * TAU;
      const dist = Math.max(W, H) * 0.65;
      this.boss = this.spawnEnemy(def, this.px + Math.cos(a) * dist, this.py + Math.sin(a) * dist);
      this.shake(16);
      this.audio.play("boss");
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const wave = this.elapsed / 60;
    this.spawnTimer = Math.max(0.16, 0.8 - wave * 0.1);
    const count = 2 + Math.floor(wave * 1.8);
    const pool = this.catalog.enemies.filter((e) => this.elapsed >= e.minTime);
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
      const a = clusterAng + rand(-0.55, 0.55);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const s = Math.min(rx / (Math.abs(ca) + 1e-4), ry / (Math.abs(sa) + 1e-4)) * rand(1.0, 1.1);
      if (!this.spawnEnemy(def, this.px + ca * s, this.py + sa * s)) break;
    }
  }

  dropPickup(x: number, y: number, kind: Pickup["kind"], value: number) {
    const key = kind === "xp" ? this.xpKey : `pickup:${kind}`;
    const p = this.pickups.get(x, y, key) as Pickup | null;
    if (!p) return;
    p.setTexture(key).setActive(true).setVisible(true).setDepth(DEPTH.pickups);
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
      this.audio.play("xp", rand(-80, 80));
      while (this.xp >= this.xpNext) {
        this.xp -= this.xpNext;
        this.levelUp();
      }
    } else if (p.kind === "heal") {
      this.hp = Math.min(this.maxHp, this.hp + p.value);
      this.audio.play("heal");
      this.addText(this.px, this.py - 30, `+${p.value} HP`, 0x7cff9b, 18, -60, 0.9);
    } else if (p.kind === "magnet") {
      for (const q of this.pickups.getChildren() as Pickup[]) {
        if (!q.active || q.kind !== "xp") continue;
        const a = Math.atan2(this.py - q.wy, this.px - q.wx);
        q.vx = Math.cos(a) * 900;
        q.vy = Math.sin(a) * 900;
      }
      this.addText(this.px, this.py - 30, "git pull", 0xff6fd8, 18, -60, 0.9);
      this.audio.play("magnet");
    } else {
      this.whiteFlash = 1;
      this.shake(18);
      for (const e of this.enemies.getChildren() as Enemy[]) if (e.active && !e.def.boss) this.hurtEnemy(e, 10000, 0, 0, 0xffffff);
      this.addText(this.px, this.py - 30, "rm -rf *", 0xffd84d, 24, -60, 1.2);
      this.audio.play("nuke");
    }
  }

  levelUp() {
    this.level++;
    this.xpNext = xpForLevel(this.level);
    this.score += 120;
    this.audio.play("levelup");
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
      const def = w.def;
      if (w.level < def.levels.length)
        pool.push({ key: "w:" + def.id, kind: "weapon", id: def.id, name: def.name, image: def.imageUrl, color: def.color, desc: def.levels[w.level].description, level: w.level + 1, isNew: false });
    }
    if (this.weapons.length < MAX_WEAPONS) {
      for (const def of this.catalog.weapons) {
        if (this.weapons.some((w) => w.def.id === def.id)) continue;
        pool.push({ key: "w:" + def.id, kind: "weapon", id: def.id, name: def.name, image: def.imageUrl, color: def.color, desc: def.description, level: 1, isNew: true });
      }
    }
    for (const def of this.catalog.passiveItems) {
      const lv = this.passives[def.id] ?? 0;
      if (lv >= def.maxLevel) continue;
      if (lv === 0 && Object.keys(this.passives).length >= MAX_PASSIVES) continue;
      pool.push({ key: "p:" + def.id, kind: "passive", id: def.id, name: def.name, image: def.imageUrl, color: def.color, desc: def.description, level: lv + 1, isNew: lv === 0 });
    }
    const out: UpgradeOption[] = [];
    for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    while (out.length < 3) {
      out.push({ key: "heal" + out.length, kind: "heal", id: "heal", name: "Free Pizza", image: this.catalog.pickups.find((p) => p.id === "heal")?.imageUrl ?? null, color: "#7cff9b", desc: "Restore 40 HP and gain 250 score.", level: 1, isNew: false });
    }
    return out;
  }

  applyUpgrade(o: UpgradeOption) {
    if (o.kind === "weapon") {
      const existing = this.weapons.find((w) => w.def.id === o.id);
      if (existing) existing.level++;
      else this.weapons.push(newWeapon(this.weaponDefs.get(o.id)!, 0.2));
    } else if (o.kind === "passive") {
      const def = this.passiveDefs.get(o.id)!;
      this.passives[def.id] = (this.passives[def.id] ?? 0) + 1;
      if (def.stat === "maxHp") {
        this.maxHp += def.value;
        this.hp += def.value;
      }
      this.applyPassives();
    } else {
      this.hp = Math.min(this.maxHp, this.hp + 40);
      this.score += 250;
      this.audio.play("heal");
    }
    this.setStatus("playing");
    this.emitHud();
  }

  applyPassives() {
    const add = { speed: 0, damage: 0, pickupRadius: 0, xp: 0 };
    let cooldown = 1;
    let taken = 1;
    let hpLevels = 0;
    for (const [id, lv] of Object.entries(this.passives)) {
      const { stat, value } = this.passiveDefs.get(id)!;
      if (stat === "cooldown") cooldown *= Math.pow(1 - value, lv);
      else if (stat === "armor") taken *= Math.pow(1 - value, lv);
      else if (stat === "maxHp") hpLevels += lv;
      else add[stat] += value * lv;
    }
    this.speed = this.char.speed * (1 + add.speed) * this.bonus.movementSpeed;
    this.damageMul = this.char.damageMul * (1 + add.damage);
    this.pickupRadius = this.char.pickupRadius * (1 + add.pickupRadius);
    this.xpMul = this.char.xpMul * (1 + add.xp);
    this.cdMul = cooldown / this.bonus.attackSpeed;
    this.armor = 1 - taken;
    this.regen = 0.4 * hpLevels + this.bonus.regeneration;
  }

  burst(x: number, y: number, n: number, color: number, spd = 160) {
    this.burstColor = color;
    this.burstSpeed = spd;
    this.sparks.explode(n, x, y);
  }

  shake(px: number) {
    this.cameras.main.shake(px >= 9 ? 260 : 120, px / Math.max(this.scale.width, 1), px >= 9);
  }

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

  draw() {
    const cam = this.cameras.main;
    const W = this.scale.width;
    const H = this.scale.height;
    cam.centerOn(this.px, this.py);

    const T = this.tile;
    this.floor.setPosition(Math.floor(cam.scrollX / T) * T, Math.floor(cam.scrollY / T) * T);
    if (this.floor.width !== W + T || this.floor.height !== H + T) this.floor.setSize(W + T, H + T);

    const vx0 = cam.scrollX - 80;
    const vy0 = cam.scrollY - 80;
    const vx1 = cam.scrollX + W + 80;
    const vy1 = cam.scrollY + H + 80;

    const u = this.under.clear();
    const o = this.over.clear();

    u.fillStyle(0x000000, 0.4).fillEllipse(this.px, this.py + 18, 28, 10);
    u.lineStyle(2, hex(this.char.color), 0.35 + Math.sin(this.elapsed * 4) * 0.1).strokeCircle(this.px, this.py, 22);

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

    for (const r of this.rings) {
      const a = Phaser.Math.Clamp(1 - r.r / r.maxR, 0, 1) * 0.9;
      u.lineStyle(r.width * 2.2, r.color, a * 0.25).strokeCircle(r.x, r.y, r.r);
      u.lineStyle(r.width, r.color, a).strokeCircle(r.x, r.y, r.r);
    }

    for (const a of this.arcs) {
      const k = a.life / a.maxLife;
      const h = a.half * (0.5 + k * 0.5);
      u.fillStyle(a.color, k * 0.16).slice(this.px, this.py, a.range, a.ang - h, a.ang + h).fillPath();
      u.fillStyle(a.color, k * 0.22).slice(this.px, this.py, a.range * 0.7, a.ang - h, a.ang + h).fillPath();
      u.fillStyle(0xffdc78, k * 0.35).slice(this.px, this.py, a.range * 0.4, a.ang - h, a.ang + h).fillPath();
    }

    for (const [id, g] of this.auraGfx) {
      const w = this.weapons.find((x) => x.def.id === id);
      if (!w) continue;
      const radius = stats(w).area;
      const color = hex(w.def.color);
      if (w.drawn !== w.level) {
        w.drawn = w.level;
        const dash = 8 / radius;
        const gap = 10 / radius;
        g.clear().lineStyle(2, color, 0.5);
        for (let a = 0; a < TAU; a += dash + gap) g.beginPath().arc(0, 0, radius, a, a + dash).strokePath();
      }
      g.setPosition(this.px, this.py).setAlpha(0.36 + 0.64 * w.pulse);
      if (w.pulse > 0) u.fillStyle(color, 0.07 * w.pulse).fillCircle(this.px, this.py, radius);
    }

    for (const [id, imgs] of this.orbitImgs) {
      const w = this.weapons.find((x) => x.def.id === id);
      const s = w && stats(w);
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        if (!w || !s || i >= s.count) {
          img.setVisible(false);
          continue;
        }
        const ang = w.phase + (i / s.count) * TAU;
        img.setVisible(true).setScale((s.size * 1.8) / Math.max(img.frame.width, img.frame.height));
        img.setPosition(this.px + Math.cos(ang) * s.area, this.py + Math.sin(ang) * s.area);
      }
    }

    const moving = Math.hypot(this.pvx, this.pvy) > 12;
    const walkFrame = this.hasWalk && moving && Math.sin(this.walkT) > 0;
    const key = walkFrame ? `char:${this.char.id}-walk` : `char:${this.char.id}`;
    if (this.player.texture.key !== key) this.player.setTexture(key);
    this.player.setPosition(this.px, this.py - 3 + Math.sin(this.walkT) * 4);
    this.player.setFlipX(Math.cos(this.facing) < 0);
    this.player.setAlpha(this.iframe > 0 && Math.floor(this.iframe * 20) % 2 === 0 ? 0.4 : 1);

    this.hurtRect.setSize(W, H).setAlpha(this.hurtFlash * 0.3);
    this.whiteRect.setSize(W, H).setAlpha(this.whiteFlash * 0.45);
  }
}
