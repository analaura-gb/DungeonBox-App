-- AlterTable
ALTER TABLE "enemies" DROP COLUMN "icon",
ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "passive_items" DROP COLUMN "icon",
ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "pickups" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "weapons" DROP COLUMN "icon",
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "shot_image_url" TEXT;

UPDATE "enemies" SET "image_url" = '/assets/enemies/' || "id" || '.png' WHERE "boss_order" IS NULL;
UPDATE "enemies" SET "image_url" = '/assets/bosses/' || "id" || '.png' WHERE "boss_order" IS NOT NULL;
UPDATE "passive_items" SET "image_url" = '/assets/passives/' || "id" || '.png';
UPDATE "pickups" SET "image_url" = '/assets/pickups/' || "id" || '.png' WHERE "id" <> 'xp';
UPDATE "weapons" SET "image_url" = '/assets/weapons/' || "id" || '.png';
UPDATE "weapons" SET "shot_image_url" = '/assets/weapons/compiler.png' WHERE "id" = 'compiler';
UPDATE "weapons" SET "shot_image_url" = '/assets/weapons/drone-shot.png' WHERE "id" = 'drone';
