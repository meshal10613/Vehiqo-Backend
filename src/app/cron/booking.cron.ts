import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { BookingStatus } from "../../generated/prisma/enums";

cron.schedule("*/30 * * * *", async () => {
    try {
        console.log("Cron job running....")
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const deleted = await prisma.booking.deleteMany({
            where: {
                status: BookingStatus.PENDING,
                createdAt: { lte: oneDayAgo },
            },
        });

        console.log(`[CRON] Deleted ${deleted.count} expired pending bookings`);
    } catch (error) {
        console.error("[CRON] Failed to delete expired pending bookings:", error);
    }
});