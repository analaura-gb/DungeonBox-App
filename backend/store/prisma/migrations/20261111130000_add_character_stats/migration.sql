-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "damage_mul" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hp" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pickup_radius" INTEGER NOT NULL DEFAULT 85,
ADD COLUMN     "speed" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "xp_mul" DOUBLE PRECISION NOT NULL DEFAULT 1;

ALTER TABLE "characters" ALTER COLUMN "color" DROP DEFAULT,
ALTER COLUMN "damage_mul" DROP DEFAULT,
ALTER COLUMN "description" DROP DEFAULT,
ALTER COLUMN "hp" DROP DEFAULT,
ALTER COLUMN "icon" DROP DEFAULT,
ALTER COLUMN "pickup_radius" DROP DEFAULT,
ALTER COLUMN "speed" DROP DEFAULT,
ALTER COLUMN "title" DROP DEFAULT,
ALTER COLUMN "xp_mul" DROP DEFAULT;

INSERT INTO "characters" ("id", "name", "title", "description", "icon", "color", "price", "initial_weapon_id", "hp", "speed", "damage_mul", "xp_mul", "pickup_radius", "image_url", "updated_at") VALUES
    ('ana-laura', 'Ana Laura', 'Programming Expert', 'Learns fast. +25% XP gain, balanced stats.', '🎓', '#63e6ff', 0, 'compiler', 100, 205, 1, 1.25, 85, 'characters/ana-laura', CURRENT_TIMESTAMP),
    ('guilherme', 'Guilherme', 'Calculus Master', 'Runs office hours. Tanky, starts with books.', '📋', '#ffd84d', 0, 'duck', 140, 190, 1, 1, 95, 'characters/guilherme', CURRENT_TIMESTAMP),
    ('bruno', 'Bruno', 'Network Professional', 'Fast hands, fast feet. +20% speed.', '🔌', '#ff7a45', 300, 'wifi', 90, 245, 1.1, 1, 85, 'characters/bruno', CURRENT_TIMESTAMP),
    ('enzo', 'Enzo', 'Database Legend', 'Slow but devastating. +35% damage.', '🧑‍🏫', '#7cff9b', 500, 'gc', 110, 172, 1.35, 1, 110, 'characters/enzo', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
