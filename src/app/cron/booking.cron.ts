import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { BookingStatus, VehicleStatus } from "../../generated/prisma/enums";

//* Pending bookings will be cancelled after 1 day and vehicles will be available
cron.schedule("*/30 * * * *", async () => {
    try {
        console.log("Cron job running....");
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: BookingStatus.PENDING,
                updatedAt: { lte: oneDayAgo },
            },
            select: {
                id: true,
                vehicleId: true,
            },
        });

        if (expiredBookings.length === 0) {
            console.log("[CRON] No expired pending bookings found");
            return;
        }

        const bookingIds = expiredBookings.map((b) => b.id);
        const vehicleIds = [
            ...new Set(expiredBookings.map((b) => b.vehicleId)),
        ];

        const [deleted, released] = await prisma.$transaction([
            // Hard delete all expired PENDING bookings
            prisma.booking.updateMany({
                where: { id: { in: bookingIds } },
                data: {status: BookingStatus.CANCELLED},
            }),

            // Release their vehicles back to the fleet
            prisma.vehicle.updateMany({
                where: { id: { in: vehicleIds } },
                data: { status: VehicleStatus.AVAILABLE },
            }),
        ]);

        console.log(
            `[CRON] Deleted ${deleted.count} expired pending booking(s) | ` +
                `Released ${released.count} vehicle(s) → AVAILABLE`,
        );
    } catch (error) {
        console.error(
            "[CRON] Failed to clean up expired pending bookings:",
            error,
        );
    }
});
