-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('IN_PROGRESS', 'WON', 'DIED');

-- CreateTable
CREATE TABLE "weapons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_level" INTEGER NOT NULL,

    CONSTRAINT "weapons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passive_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_level" INTEGER NOT NULL,

    CONSTRAINT "passive_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_weapon_id" TEXT NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER NOT NULL DEFAULT 0,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "level_reached" INTEGER NOT NULL DEFAULT 1,
    "survived_time" INTEGER NOT NULL DEFAULT 0,
    "coins_earned" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_weapons" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "weapon_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "run_weapons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_passive_items" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "passive_item_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "run_passive_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "runs_user_id_idx" ON "runs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "run_weapons_run_id_weapon_id_key" ON "run_weapons"("run_id", "weapon_id");

-- CreateIndex
CREATE UNIQUE INDEX "run_passive_items_run_id_passive_item_id_key" ON "run_passive_items"("run_id", "passive_item_id");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_start_weapon_id_fkey" FOREIGN KEY ("start_weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_weapons" ADD CONSTRAINT "run_weapons_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_weapons" ADD CONSTRAINT "run_weapons_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_passive_items" ADD CONSTRAINT "run_passive_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_passive_items" ADD CONSTRAINT "run_passive_items_passive_item_id_fkey" FOREIGN KEY ("passive_item_id") REFERENCES "passive_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
