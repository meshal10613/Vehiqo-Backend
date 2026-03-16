import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { VehicleStatus } from "../../generated/prisma/enums";

cron.schedule("*/30 * * * *", async () => {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const updated = await prisma.vehicle.updateMany({
            where: {
                status: VehicleStatus.MAINTENANCE,
                updatedAt: { lte: oneDayAgo },
            },
            data: {
                status: VehicleStatus.AVAILABLE,
            },
        });

        console.log(`[CRON] Restored ${updated.count} vehicles from maintenance to available`);
    } catch (error) {
        console.error("[CRON] Failed to restore maintenance vehicles:", error);
    }
});