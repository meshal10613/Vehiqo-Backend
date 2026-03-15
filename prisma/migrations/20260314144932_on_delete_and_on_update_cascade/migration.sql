-- DropForeignKey
ALTER TABLE "VehicleType" DROP CONSTRAINT "VehicleType_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "VehicleType" ADD CONSTRAINT "VehicleType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VehicleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
