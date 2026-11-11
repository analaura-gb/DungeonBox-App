-- CreateTable
CREATE TABLE "power_ups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "health" INTEGER NOT NULL,
    "movement_speed" DOUBLE PRECISION NOT NULL,
    "attack_speed" DOUBLE PRECISION NOT NULL,
    "projectile_speed" DOUBLE PRECISION NOT NULL,
    "projectile_size" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "power_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "initial_weapon_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_power_ups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "power_up_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_power_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_characters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_power_ups_user_id_idx" ON "user_power_ups"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_power_ups_user_id_power_up_id_key" ON "user_power_ups"("user_id", "power_up_id");

-- CreateIndex
CREATE INDEX "user_characters_user_id_idx" ON "user_characters"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_characters_user_id_character_id_key" ON "user_characters"("user_id", "character_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- AddForeignKey
ALTER TABLE "user_power_ups" ADD CONSTRAINT "user_power_ups_power_up_id_fkey" FOREIGN KEY ("power_up_id") REFERENCES "power_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_characters" ADD CONSTRAINT "user_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
