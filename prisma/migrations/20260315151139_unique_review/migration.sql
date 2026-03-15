/*
  Warnings:

  - A unique constraint covering the columns `[vehicleId,userId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Review_vehicleId_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Review_vehicleId_userId_key" ON "Review"("vehicleId", "userId");
