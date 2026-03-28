-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "fuelLevelPickup" DOUBLE PRECISION,
ADD COLUMN     "fuelLevelReturn" DOUBLE PRECISION;
