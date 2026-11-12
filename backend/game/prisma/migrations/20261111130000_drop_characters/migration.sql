-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_start_weapon_id_fkey";

-- DropForeignKey
ALTER TABLE "runs" DROP CONSTRAINT "runs_character_id_fkey";

-- AlterTable
ALTER TABLE "runs" ADD COLUMN     "start_weapon_id" TEXT;

UPDATE "runs" SET "start_weapon_id" = "characters"."start_weapon_id"
FROM "characters"
WHERE "characters"."id" = "runs"."character_id";

-- DropTable
DROP TABLE "characters";
