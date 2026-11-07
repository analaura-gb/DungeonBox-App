// ---------------------------------------------------------------------------
// CS-DEPT SURVIVORS — game content definitions
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------- settings
// Survive this long to win the run (in seconds). 10 * 60 = 10 minutes.
export const TIME_LIMIT = 10 * 60;

// How many different weapons / passives the player can carry at once.
export const MAX_WEAPONS = 3;
export const MAX_PASSIVES = 3;

// XP needed to go from `level` to `level + 1`. The power (2.2) makes every
// level noticeably more expensive than the previous one.
export const xpForLevel = (level: number) => Math.floor(8 + level * 6 + Math.pow(level, 2.2));

// Chance (0-1) that a normal enemy drops the bomb that clears the screen.
// Bosses always drop one.
export const NUKE_DROP_CHANCE = 0.001;

// Multiplies the damage every enemy deals to the player (1 = original, 1.3 = +30%).
export const ENEMY_DAMAGE_MUL = 1.3;

// Size, in world pixels, of one floor tile (public/sprites/map/floor.png).
// Bigger = floor details look bigger.
export const FLOOR_TILE_SIZE = 512;

// Darkens the floor so enemies and XP stand out (0 = original image, 1 = black).
export const FLOOR_DIM = 0.3;

export type WeaponId =
  | "compiler"
  | "duck"
  | "gc"
  | "wifi"
  | "solder"
  | "drone";

export type PassiveId =
  | "espresso"
  | "ram"
  | "overclock"
  | "bigO"
  | "magnet"
  | "notes"
  | "thermal";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  levelDesc: string[];
  maxLevel: number;
}

export interface PassiveDef {
  id: PassiveId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  maxLevel: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  compiler: {
    id: "compiler",
    name: "Programming Balloon",
    icon: "🎈",
    color: "#ff5fa2",
    desc: "Launches balloons at the nearest threat.",
    levelDesc: [
      "Fires 1 balloon at the nearest enemy.",
      "+1 balloon.",
      "Balloons pierce 1 enemy.",
      "+1 balloon, faster launches.",
      "+damage, faster launches.",
      "Balloons pierce 1 more enemy.",
      "+1 balloon.",
      "-O3: balloons pierce 1 more enemy, fastest launches.",
    ],
    maxLevel: 8,
  },
  duck: {
    id: "duck",
    name: "Algorithm Book",
    icon: "🦆",
    color: "#ffd84d",
    desc: "Algorithm books circle you and squash bugs.",
    levelDesc: [
      "1 book orbits you.",
      "+1 book.",
      "+1 book, faster orbit.",
      "+40% damage, bigger books.",
      "+1 book.",
      "+damage, faster orbit.",
      "+1 book.",
      "Library of 6 books.",
    ],
    maxLevel: 8,
  },
  gc: {
    id: "gc",
    name: "Garbage Collector",
    icon: "♻️",
    color: "#7cff9b",
    desc: "Cleanup zone that keeps hurting every bug around you.",
    levelDesc: [
      "Hurts enemies inside your memory zone.",
      "+radius, +damage.",
      "Faster collection cycles.",
      "+radius, slows enemies inside.",
      "+radius, +damage.",
      "Generational GC: +60% damage.",
      "Faster collection cycles.",
      "Stop-the-world: enormous zone.",
    ],
    maxLevel: 8,
  },
  wifi: {
    id: "wifi",
    name: "Wi-Fi Pulse",
    icon: "📡",
    color: "#a78bfa",
    desc: "Expanding shockwave that blasts packets outward.",
    levelDesc: [
      "Ring of 2.4GHz pain.",
      "+damage, +knockback.",
      "Faster broadcast interval.",
      "5GHz: +range, +damage.",
      "Faster broadcast interval.",
      "Double ring.",
      "+range, +damage.",
      "Mesh network: triple ring.",
    ],
    maxLevel: 8,
  },
  solder: {
    id: "solder",
    name: "Soldering Iron",
    icon: "🔥",
    color: "#ff7a45",
    desc: "Scorching arc swipe in the direction you face.",
    levelDesc: [
      "Swipes a burning arc.",
      "+arc width, +damage.",
      "Faster swipes.",
      "+40% damage, burns targets.",
      "+arc width, +range.",
      "Swipes both directions.",
      "Faster swipes.",
      "Reflow oven: gigantic arc.",
    ],
    maxLevel: 8,
  },
  drone: {
    id: "drone",
    name: "Drone Swarm",
    icon: "🛸",
    color: "#ff6fd8",
    desc: "Homing lab drones seek out targets.",
    levelDesc: [
      "Launches 1 homing drone.",
      "+1 drone.",
      "+20% damage, faster.",
      "+1 drone.",
      "Drones explode on impact.",
      "+damage, faster launches.",
      "+1 drone.",
      "Swarm intelligence: +1 drone.",
    ],
    maxLevel: 8,
  },
};

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  espresso: {
    id: "espresso",
    name: "Espresso Shot",
    icon: "☕",
    color: "#c48a5a",
    desc: "+8% movement speed per level.",
    maxLevel: 8,
  },
  ram: {
    id: "ram",
    name: "Extra RAM",
    icon: "🧠",
    color: "#63e6ff",
    desc: "+15 max HP and slow regeneration per level.",
    maxLevel: 8,
  },
  overclock: {
    id: "overclock",
    name: "Overclock",
    icon: "⏱️",
    color: "#ffd84d",
    desc: "-6% weapon cooldowns per level.",
    maxLevel: 8,
  },
  bigO: {
    id: "bigO",
    name: "Big-O Optimization",
    icon: "📈",
    color: "#7cff9b",
    desc: "+10% all damage per level.",
    maxLevel: 8,
  },
  magnet: {
    id: "magnet",
    name: "Git Magnet",
    icon: "🧲",
    color: "#ff6fd8",
    desc: "+25% commit pickup radius per level.",
    maxLevel: 8,
  },
  notes: {
    id: "notes",
    name: "Lecture Notes",
    icon: "📚",
    color: "#a78bfa",
    desc: "+12% XP from commits per level.",
    maxLevel: 8,
  },
  thermal: {
    id: "thermal",
    name: "Thermal Paste",
    icon: "🧊",
    color: "#9fb4c7",
    desc: "-5% damage taken per level.",
    maxLevel: 8,
  },
};

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  icon: string;
  color: string;
  blurb: string;
  hp: number;
  speed: number;
  damageMul: number;
  xpMul: number;
  pickupRadius: number;
  startWeapon: WeaponId;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "ana-laura",
    name: "Ana Laura",
    title: "Programming Expert",
    icon: "🎓",
    color: "#63e6ff",
    blurb: "Learns fast. +25% XP gain, balanced stats.",
    hp: 100,
    speed: 205,
    damageMul: 1,
    xpMul: 1.25,
    pickupRadius: 85,
    startWeapon: "compiler",
  },
  {
    id: "guilherme",
    name: "Guilherme",
    title: "Calculus Master",
    icon: "📋",
    color: "#ffd84d",
    blurb: "Runs office hours. Tanky, starts with books.",
    hp: 140,
    speed: 190,
    damageMul: 1.0,
    xpMul: 1.0,
    pickupRadius: 95,
    startWeapon: "duck",
  },
  {
    id: "enzo",
    name: "Enzo",
    title: "Database Legend",
    icon: "🧑‍🏫",
    color: "#7cff9b",
    blurb: "Slow but devastating. +35% damage.",
    hp: 110,
    speed: 172,
    damageMul: 1.35,
    xpMul: 1.0,
    pickupRadius: 110,
    startWeapon: "gc",
  },
  {
    id: "bruno",
    name: "Bruno",
    title: "Network Professional",
    icon: "🔌",
    color: "#ff7a45",
    blurb: "Fast hands, fast feet. +20% speed.",
    hp: 90,
    speed: 245,
    damageMul: 1.1,
    xpMul: 1.0,
    pickupRadius: 85,
    startWeapon: "wifi",
  },
];

export interface EnemyDef {
  id: string;
  name: string;
  icon: string;
  color: string;
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

export const ENEMIES: EnemyDef[] = [
  {
    id: "bug",
    name: "Bug",
    icon: "🐛",
    color: "#7cff9b",
    hp: 10,
    speed: 62,
    damage: 7,
    radius: 15,
    xp: 1,
    score: 10,
    minTime: 0,
    weight: 100,
  },
  {
    id: "null",
    name: "Null Pointer",
    icon: "👻",
    color: "#9fd6ff",
    hp: 7,
    speed: 108,
    damage: 6,
    radius: 14,
    xp: 1,
    score: 14,
    minTime: 35,
    weight: 60,
  },
  {
    id: "crash",
    name: "Kernel Panic",
    icon: "💀",
    color: "#ff6b6b",
    hp: 30,
    speed: 72,
    damage: 12,
    radius: 18,
    xp: 3,
    score: 30,
    minTime: 75,
    weight: 45,
  },
  {
    id: "merge",
    name: "Merge Conflict",
    icon: "🔀",
    color: "#ff9f43",
    hp: 40,
    speed: 58,
    damage: 11,
    radius: 20,
    xp: 4,
    score: 40,
    minTime: 110,
    weight: 32,
    splits: 2,
  },
  {
    id: "deadline",
    name: "Deadline",
    icon: "⏰",
    color: "#ffd84d",
    hp: 85,
    speed: 52,
    damage: 18,
    radius: 24,
    xp: 7,
    score: 75,
    minTime: 160,
    weight: 24,
  },
  {
    id: "legacy",
    name: "Legacy Code",
    icon: "🗄️",
    color: "#b08968",
    hp: 190,
    speed: 40,
    damage: 22,
    radius: 30,
    xp: 12,
    score: 140,
    minTime: 230,
    weight: 16,
  },
];

// Bosses appear in this order (one every 95 s) and the list repeats after the last one.
export const BOSSES: EnemyDef[] = [
  {
    id: "calc1",
    name: "CALCULUS",
    icon: "📝",
    color: "#ff4d6d",
    hp: 900,
    speed: 58,
    damage: 30,
    radius: 46,
    xp: 90,
    score: 1500,
    minTime: 0,
    weight: 0,
    boss: true,
  },
  {
    id: "calc2",
    name: "LINEAR ALGEBRA",
    icon: "📝",
    color: "#ff9f43",
    hp: 1300,
    speed: 60,
    damage: 33,
    radius: 48,
    xp: 120,
    score: 2200,
    minTime: 0,
    weight: 0,
    boss: true,
  },
  {
    id: "calc3",
    name: "ELECTROMAGNETISM",
    icon: "📝",
    color: "#ffd84d",
    hp: 1700,
    speed: 62,
    damage: 35,
    radius: 50,
    xp: 150,
    score: 3000,
    minTime: 0,
    weight: 0,
    boss: true,
  },
  {
    id: "thesis",
    name: "THESIS DEFENSE",
    icon: "🎓",
    color: "#c77dff",
    hp: 2200,
    speed: 64,
    damage: 38,
    radius: 54,
    xp: 200,
    score: 4000,
    minTime: 0,
    weight: 0,
    boss: true,
  },
];
