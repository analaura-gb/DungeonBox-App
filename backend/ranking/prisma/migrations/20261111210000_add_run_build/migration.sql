-- AlterTable
ALTER TABLE "run_stats" ADD COLUMN     "passive_items" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "weapons" JSONB NOT NULL DEFAULT '[]';
