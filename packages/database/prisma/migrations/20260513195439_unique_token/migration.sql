/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `demolinks` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `description` to the `demolinks` table without a default value. This is not possible if the table is not empty.
  - Made the column `token` on table `demolinks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."demolinks" ADD COLUMN     "description" TEXT NOT NULL,
ALTER COLUMN "token" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "demolinks_token_key" ON "public"."demolinks"("token");
