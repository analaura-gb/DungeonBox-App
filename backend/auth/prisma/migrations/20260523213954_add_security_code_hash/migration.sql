/*
  Warnings:

  - Added the required column `security_code_hash` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "security_code_hash" TEXT NOT NULL;
