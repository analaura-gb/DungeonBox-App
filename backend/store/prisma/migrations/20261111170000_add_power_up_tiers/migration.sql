-- AlterTable
ALTER TABLE "power_ups" ADD COLUMN     "required_power_up_id" TEXT;

-- AddForeignKey
ALTER TABLE "power_ups" ADD CONSTRAINT "power_ups_required_power_up_id_fkey" FOREIGN KEY ("required_power_up_id") REFERENCES "power_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "power_ups" ("id", "name", "price", "attack", "defense", "health", "movement_speed", "attack_speed", "projectile_speed", "projectile_size", "image_url", "required_power_up_id", "updated_at") VALUES
    ('coffee-1', 'Gourmet Coffee I', 200, 0, 0, 0, 1.03, 1, 1, 1, NULL, NULL, CURRENT_TIMESTAMP),
    ('coffee-2', 'Gourmet Coffee II', 500, 0, 0, 0, 1.05, 1, 1, 1, NULL, 'coffee-1', CURRENT_TIMESTAMP),
    ('coffee-3', 'Gourmet Coffee III', 1000, 0, 0, 0, 1.07, 1, 1, 1, NULL, 'coffee-2', CURRENT_TIMESTAMP),
    ('controller-1', 'Gaming Controller I', 200, 1, 0, 0, 1, 1, 1, 1, NULL, NULL, CURRENT_TIMESTAMP),
    ('controller-2', 'Gaming Controller II', 500, 2, 0, 0, 1, 1, 1, 1, NULL, 'controller-1', CURRENT_TIMESTAMP),
    ('controller-3', 'Gaming Controller III', 1000, 3, 0, 0, 1, 1, 1, 1, NULL, 'controller-2', CURRENT_TIMESTAMP),
    ('antivirus-1', 'Antivirus I', 200, 0, 1, 0, 1, 1, 1, 1, NULL, NULL, CURRENT_TIMESTAMP),
    ('antivirus-2', 'Antivirus II', 500, 0, 2, 0, 1, 1, 1, 1, NULL, 'antivirus-1', CURRENT_TIMESTAMP),
    ('antivirus-3', 'Antivirus III', 1000, 0, 3, 0, 1, 1, 1, 1, NULL, 'antivirus-2', CURRENT_TIMESTAMP),
    ('ram-1', 'Extra RAM I', 200, 0, 0, 10, 1, 1, 1, 1, NULL, NULL, CURRENT_TIMESTAMP),
    ('ram-2', 'Extra RAM II', 500, 0, 0, 15, 1, 1, 1, 1, NULL, 'ram-1', CURRENT_TIMESTAMP),
    ('ram-3', 'Extra RAM III', 1000, 0, 0, 25, 1, 1, 1, 1, NULL, 'ram-2', CURRENT_TIMESTAMP),
    ('monitor-1', 'Gaming Monitor I', 400, 0, 0, 0, 1, 1.03, 1, 1, NULL, NULL, CURRENT_TIMESTAMP),
    ('monitor-2', 'Gaming Monitor II', 1000, 0, 0, 0, 1, 1.05, 1, 1, NULL, 'monitor-1', CURRENT_TIMESTAMP),
    ('monitor-3', 'Gaming Monitor III', 2000, 0, 0, 0, 1, 1.07, 1, 1, NULL, 'monitor-2', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
