/*
  Warnings:

  - Added the required column `appointment_type` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "appointment_type" TEXT NOT NULL;
