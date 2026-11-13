-- AlterTable
ALTER TABLE "characters" DROP COLUMN "icon",
ADD COLUMN     "sprite_url" TEXT,
ADD COLUMN     "walk_sprite_url" TEXT;

UPDATE "characters"
SET "image_url" = '/assets/characters/' || "id" || '-front.png',
    "sprite_url" = '/assets/characters/' || "id" || '.png',
    "walk_sprite_url" = '/assets/characters/' || "id" || '-walk.png',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" IN ('ana-laura', 'guilherme', 'bruno', 'enzo');
