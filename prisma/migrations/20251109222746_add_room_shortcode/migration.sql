/*
  Warnings:

  - A unique constraint covering the columns `[shortCode]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "shortCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Room_shortCode_key" ON "Room"("shortCode");
