/*
  Warnings:

  - A unique constraint covering the columns `[fuelType]` on the table `FuelPrice` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FuelPrice_fuelType_key" ON "FuelPrice"("fuelType");
