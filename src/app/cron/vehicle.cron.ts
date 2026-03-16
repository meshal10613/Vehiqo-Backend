import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { VehicleStatus } from "../../generated/prisma/enums";
import { fail, log } from ".";

//* Vehicle will be available after 1 day of maintenance
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

        if (updated.count > 0) {
            log(
                `Restored ${updated.count} vehicle(s) from MAINTENANCE → AVAILABLE`,
            );
        }
    } catch (error) {
        fail("MAINTENANCE", error);
    }
});
