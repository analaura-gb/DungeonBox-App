-- CreateEnum
CREATE TYPE "WeaponBehavior" AS ENUM ('projectile', 'orbit', 'aura', 'pulse', 'melee', 'drone');

-- CreateEnum
CREATE TYPE "WeaponEffect" AS ENUM ('slow', 'burn', 'explode');

-- CreateEnum
CREATE TYPE "PassiveStat" AS ENUM ('speed', 'maxHp', 'cooldown', 'damage', 'pickupRadius', 'xp', 'armor');

-- AlterTable
ALTER TABLE "weapons" DROP COLUMN "max_level",
ADD COLUMN "behavior" "WeaponBehavior",
ADD COLUMN "color" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "icon" TEXT,
ADD COLUMN "min_cooldown" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "passive_items" ADD COLUMN "color" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "icon" TEXT,
ADD COLUMN "stat" "PassiveStat",
ADD COLUMN "value" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "weapon_levels" (
    "id" TEXT NOT NULL,
    "weapon_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "cooldown" DOUBLE PRECISION NOT NULL,
    "damage" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "pierce" INTEGER NOT NULL DEFAULT 0,
    "area" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "size" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "knockback" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effect" "WeaponEffect",

    CONSTRAINT "weapon_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weapon_levels_weapon_id_level_key" ON "weapon_levels"("weapon_id", "level");

-- AddForeignKey
ALTER TABLE "weapon_levels" ADD CONSTRAINT "weapon_levels_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "weapons" SET "behavior" = 'projectile', "icon" = '🎈', "color" = '#ff5fa2', "description" = 'Launches balloons at the nearest threat.', "min_cooldown" = 0.25 WHERE "id" = 'compiler';
UPDATE "weapons" SET "behavior" = 'orbit', "icon" = '🦆', "color" = '#ffd84d', "description" = 'Algorithm books circle you and squash bugs.', "min_cooldown" = 0 WHERE "id" = 'duck';
UPDATE "weapons" SET "behavior" = 'aura', "icon" = '♻️', "color" = '#7cff9b', "description" = 'Cleanup zone that keeps hurting every bug around you.', "min_cooldown" = 0.3 WHERE "id" = 'gc';
UPDATE "weapons" SET "behavior" = 'pulse', "icon" = '📡', "color" = '#a78bfa', "description" = 'Expanding shockwave that blasts packets outward.', "min_cooldown" = 1.2 WHERE "id" = 'wifi';
UPDATE "weapons" SET "behavior" = 'melee', "icon" = '🔥', "color" = '#ff7a45', "description" = 'Scorching arc swipe in the direction you face.', "min_cooldown" = 0.45 WHERE "id" = 'solder';
UPDATE "weapons" SET "behavior" = 'drone', "icon" = '🛸', "color" = '#ff6fd8', "description" = 'Homing lab drones seek out targets.', "min_cooldown" = 0.55 WHERE "id" = 'drone';

INSERT INTO "weapon_levels" ("id", "weapon_id", "level", "description", "cooldown", "damage", "count", "pierce", "area", "speed", "size", "knockback", "effect") VALUES
    (gen_random_uuid(), 'compiler', 1, 'Fires 1 balloon at the nearest enemy.', 0.88, 12.5, 1, 0, 0, 560, 0, 0, NULL),
    (gen_random_uuid(), 'compiler', 2, '+1 balloon.', 0.81, 16.0, 2, 0, 0, 560, 0, 0, NULL),
    (gen_random_uuid(), 'compiler', 3, 'Balloons pierce 1 enemy.', 0.74, 19.5, 2, 1, 0, 560, 0, 0, NULL),
    (gen_random_uuid(), 'compiler', 4, '+1 balloon, faster launches.', 0.67, 23.0, 3, 1, 0, 560, 0, 0, NULL),
    (gen_random_uuid(), 'compiler', 5, '+damage, faster launches.', 0.6, 26.5, 3, 1, 0, 560, 0, 0, NULL),
    (gen_random_uuid(), 'compiler', 6, 'Balloons pierce 1 more enemy.', 0.53, 30.0, 3, 2, 0, 560, 0, 0, NULL),
    (gen_random_uuid(), 'compiler', 7, '+1 balloon.', 0.46, 33.5, 4, 2, 0, 560, 0, 0, NULL),
    (gen_random_uuid(), 'compiler', 8, '-O3: balloons pierce 1 more enemy, fastest launches.', 0.39, 37.0, 4, 3, 0, 560, 0, 0, NULL),
    (gen_random_uuid(), 'duck', 1, '1 book orbits you.', 0.45, 10.5, 1, 0, 92, 2.22, 20, 540, NULL),
    (gen_random_uuid(), 'duck', 2, '+1 book.', 0.45, 14.0, 2, 0, 92, 2.44, 20, 540, NULL),
    (gen_random_uuid(), 'duck', 3, '+1 book, faster orbit.', 0.45, 17.5, 3, 0, 92, 2.66, 20, 540, NULL),
    (gen_random_uuid(), 'duck', 4, '+40% damage, bigger books.', 0.45, 29.4, 3, 0, 110, 2.88, 26, 540, NULL),
    (gen_random_uuid(), 'duck', 5, '+1 book.', 0.45, 34.3, 4, 0, 110, 3.1, 26, 540, NULL),
    (gen_random_uuid(), 'duck', 6, '+damage, faster orbit.', 0.45, 39.2, 4, 0, 110, 3.32, 26, 540, NULL),
    (gen_random_uuid(), 'duck', 7, '+1 book.', 0.45, 44.1, 5, 0, 110, 3.54, 26, 540, NULL),
    (gen_random_uuid(), 'duck', 8, 'Library of 6 books.', 0.45, 49.0, 6, 0, 110, 3.76, 26, 540, NULL),
    (gen_random_uuid(), 'gc', 1, 'Hurts enemies inside your memory zone.', 0.585, 5.5, 1, 0, 112, 0, 0, 0, NULL),
    (gen_random_uuid(), 'gc', 2, '+radius, +damage.', 0.55, 8.0, 1, 0, 128, 0, 0, 0, NULL),
    (gen_random_uuid(), 'gc', 3, 'Faster collection cycles.', 0.515, 10.5, 1, 0, 144, 0, 0, 0, NULL),
    (gen_random_uuid(), 'gc', 4, '+radius, slows enemies inside.', 0.48, 13.0, 1, 0, 160, 0, 0, 0, 'slow'),
    (gen_random_uuid(), 'gc', 5, '+radius, +damage.', 0.445, 15.5, 1, 0, 176, 0, 0, 0, 'slow'),
    (gen_random_uuid(), 'gc', 6, 'Generational GC: +60% damage.', 0.41, 28.8, 1, 0, 192, 0, 0, 0, 'slow'),
    (gen_random_uuid(), 'gc', 7, 'Faster collection cycles.', 0.375, 32.8, 1, 0, 208, 0, 0, 0, 'slow'),
    (gen_random_uuid(), 'gc', 8, 'Stop-the-world: enormous zone.', 0.34, 36.8, 1, 0, 248, 0, 0, 0, 'slow'),
    (gen_random_uuid(), 'wifi', 1, 'Ring of 2.4GHz pain.', 3.0, 13, 1, 0, 202, 420, 10, 185, NULL),
    (gen_random_uuid(), 'wifi', 2, '+damage, +knockback.', 2.8, 18, 1, 0, 224, 420, 10, 200, NULL),
    (gen_random_uuid(), 'wifi', 3, 'Faster broadcast interval.', 2.6, 23, 1, 0, 246, 420, 10, 215, NULL),
    (gen_random_uuid(), 'wifi', 4, '5GHz: +range, +damage.', 2.4, 28, 1, 0, 268, 420, 10, 230, NULL),
    (gen_random_uuid(), 'wifi', 5, 'Faster broadcast interval.', 2.2, 33, 1, 0, 290, 420, 10, 245, NULL),
    (gen_random_uuid(), 'wifi', 6, 'Double ring.', 2.0, 38, 2, 0, 312, 420, 10, 260, NULL),
    (gen_random_uuid(), 'wifi', 7, '+range, +damage.', 1.8, 43, 2, 0, 334, 420, 10, 275, NULL),
    (gen_random_uuid(), 'wifi', 8, 'Mesh network: triple ring.', 1.6, 48, 3, 0, 356, 420, 10, 290, NULL),
    (gen_random_uuid(), 'solder', 1, 'Swipes a burning arc.', 1.25, 20, 1, 0, 119, 0, 0.62, 8, NULL),
    (gen_random_uuid(), 'solder', 2, '+arc width, +damage.', 1.15, 26, 1, 0, 130, 0, 0.69, 8, NULL),
    (gen_random_uuid(), 'solder', 3, 'Faster swipes.', 1.05, 32, 1, 0, 141, 0, 0.76, 8, NULL),
    (gen_random_uuid(), 'solder', 4, '+40% damage, burns targets.', 0.95, 53.2, 1, 0, 152, 0, 0.83, 8, 'burn'),
    (gen_random_uuid(), 'solder', 5, '+arc width, +range.', 0.85, 61.6, 1, 0, 163, 0, 0.9, 8, 'burn'),
    (gen_random_uuid(), 'solder', 6, 'Swipes both directions.', 0.75, 70.0, 2, 0, 174, 0, 0.97, 8, 'burn'),
    (gen_random_uuid(), 'solder', 7, 'Faster swipes.', 0.65, 78.4, 2, 0, 185, 0, 1.04, 8, 'burn'),
    (gen_random_uuid(), 'solder', 8, 'Reflow oven: gigantic arc.', 0.55, 86.8, 2, 0, 226, 0, 1.11, 8, 'burn'),
    (gen_random_uuid(), 'drone', 1, 'Launches 1 homing drone.', 1.58, 13.5, 1, 0, 0, 240, 0, 0, NULL),
    (gen_random_uuid(), 'drone', 2, '+1 drone.', 1.46, 17.0, 2, 0, 0, 240, 0, 0, NULL),
    (gen_random_uuid(), 'drone', 3, '+20% damage, faster.', 1.34, 24.6, 2, 0, 0, 240, 0, 0, NULL),
    (gen_random_uuid(), 'drone', 4, '+1 drone.', 1.22, 28.8, 3, 0, 0, 240, 0, 0, NULL),
    (gen_random_uuid(), 'drone', 5, 'Drones explode on impact.', 1.1, 33.0, 3, 0, 0, 240, 0, 0, 'explode'),
    (gen_random_uuid(), 'drone', 6, '+damage, faster launches.', 0.98, 37.2, 3, 0, 0, 240, 0, 0, 'explode'),
    (gen_random_uuid(), 'drone', 7, '+1 drone.', 0.86, 41.4, 4, 0, 0, 240, 0, 0, 'explode'),
    (gen_random_uuid(), 'drone', 8, 'Swarm intelligence: +1 drone.', 0.74, 45.6, 5, 0, 0, 240, 0, 0, 'explode');

UPDATE "passive_items" SET "icon" = '☕', "color" = '#c48a5a', "description" = '+8% movement speed per level.', "stat" = 'speed', "value" = 0.08 WHERE "id" = 'espresso';
UPDATE "passive_items" SET "icon" = '🧠', "color" = '#63e6ff', "description" = '+15 max HP and slow regeneration per level.', "stat" = 'maxHp', "value" = 15 WHERE "id" = 'ram';
UPDATE "passive_items" SET "icon" = '⏱️', "color" = '#ffd84d', "description" = '-6% weapon cooldowns per level.', "stat" = 'cooldown', "value" = 0.06 WHERE "id" = 'overclock';
UPDATE "passive_items" SET "icon" = '📈', "color" = '#7cff9b', "description" = '+10% all damage per level.', "stat" = 'damage', "value" = 0.1 WHERE "id" = 'bigO';
UPDATE "passive_items" SET "icon" = '🧲', "color" = '#ff6fd8', "description" = '+25% commit pickup radius per level.', "stat" = 'pickupRadius', "value" = 0.25 WHERE "id" = 'magnet';
UPDATE "passive_items" SET "icon" = '📚', "color" = '#a78bfa', "description" = '+12% XP from commits per level.', "stat" = 'xp', "value" = 0.12 WHERE "id" = 'notes';
UPDATE "passive_items" SET "icon" = '🧊', "color" = '#9fb4c7', "description" = '-5% damage taken per level.', "stat" = 'armor', "value" = 0.05 WHERE "id" = 'thermal';

-- AlterTable
ALTER TABLE "weapons" ALTER COLUMN "behavior" SET NOT NULL,
ALTER COLUMN "color" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "icon" SET NOT NULL;

-- AlterTable
ALTER TABLE "passive_items" ALTER COLUMN "color" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "icon" SET NOT NULL,
ALTER COLUMN "stat" SET NOT NULL,
ALTER COLUMN "value" SET NOT NULL;
