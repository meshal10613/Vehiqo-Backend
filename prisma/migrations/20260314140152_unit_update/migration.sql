/*
  Warnings:

  - Changed the type of `unit` on the `FuelPrice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
ALTER TYPE "Unit" ADD VALUE 'CUBIC_METRE';

-- AlterTable
ALTER TABLE "FuelPrice" DROP COLUMN "unit",
ADD COLUMN     "unit" "Unit" NOT NULL;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_fuelType_fkey" FOREIGN KEY ("fuelType") REFERENCES "FuelPrice"("fuelType") ON DELETE CASCADE ON UPDATE CASCADE;
