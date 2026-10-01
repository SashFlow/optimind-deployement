/*
  Warnings:

  - You are about to drop the `avatar_profile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."avatar_profile" DROP CONSTRAINT "avatar_profile_organizationId_fkey";

-- DropTable
DROP TABLE "public"."avatar_profile";
