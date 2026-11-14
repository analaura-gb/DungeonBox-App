export const TIME_LIMIT = 10 * 60;

export const MAX_WEAPONS = 3;
export const MAX_PASSIVES = 3;

export const xpForLevel = (level: number) => Math.floor(8 + level * 6 + Math.pow(level, 2));

export const ENEMY_DAMAGE_MUL = 1.3;

export const FLOOR_TILE_SIZE = 512;

export const FLOOR_DIM = 0.3;

export type WeaponBehavior = "projectile" | "orbit" | "aura" | "pulse" | "melee" | "drone";

export type WeaponEffect = "slow" | "burn" | "explode";

export interface WeaponLevel {
  level: number;
  description: string;
  cooldown: number;
  damage: number;
  count: number;
  pierce: number;
  area: number;
  speed: number;
  size: number;
  knockback: number;
  effect: WeaponEffect | null;
}

export interface WeaponDef {
  id: string;
  name: string;
  color: string;
  description: string;
  behavior: WeaponBehavior;
  minCooldown: number;
  imageUrl: string | null;
  shotImageUrl: string | null;
  levels: WeaponLevel[];
}

export type PassiveStat = "speed" | "maxHp" | "cooldown" | "damage" | "pickupRadius" | "xp" | "armor";

export interface PassiveDef {
  id: string;
  name: string;
  color: string;
  imageUrl: string | null;
  description: string;
  maxLevel: number;
  stat: PassiveStat;
  value: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  description: string;
  color: string;
  price: number;
  initialWeaponId: string;
  hp: number;
  speed: number;
  damageMul: number;
  xpMul: number;
  pickupRadius: number;
  imageUrl: string | null;
  spriteUrl: string | null;
  walkSpriteUrl: string | null;
}

export interface EnemyDef {
  id: string;
  name: string;
  color: string;
  imageUrl: string | null;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  score: number;
  minTime: number;
  weight: number;
  boss?: boolean;
  splits?: number;
}

export type PickupKind = "xp" | "heal" | "magnet" | "nuke";

export interface PickupDef {
  id: PickupKind;
  name: string;
  value: number;
  dropChance: number;
  imageUrl: string | null;
}

export interface GameCatalog {
  enemies: EnemyDef[];
  bosses: EnemyDef[];
  pickups: PickupDef[];
  weapons: WeaponDef[];
  passiveItems: PassiveDef[];
}

export interface PowerUpDef {
  id: string;
  attack: number;
  defense: number;
  health: number;
  movementSpeed: number;
  attackSpeed: number;
  projectileSpeed: number;
  projectileSize: number;
  regeneration: number;
}

export interface GameData extends GameCatalog {
  characters: CharacterDef[];
  powerUps: PowerUpDef[];
}
