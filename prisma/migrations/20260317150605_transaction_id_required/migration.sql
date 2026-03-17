/*
  Warnings:

  - Made the column `transactionId` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `invoiceUrl` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'UNPAID';

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'UNPAID',
ALTER COLUMN "transactionId" SET NOT NULL,
ALTER COLUMN "invoiceUrl" SET NOT NULL;
