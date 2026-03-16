import z from "zod";

export const createBookingSchema = z
    .object({
        vehicleId: z.string().uuid("Invalid vehicle ID"),
        startDate: z.coerce
            .date({ message: "Start date is required" })
            .refine((date) => date > new Date(), {
                message: "Start date must be in the future",
            }),
        endDate: z.coerce.date({ message: "End date is required" }),
        pickedUpAt: z.coerce.date().optional(),
        advanceAmount: z
            .number()
            .min(500, "Advance amount must be at least 500"),
        notes: z.string().max(500).optional(),
    })
    .refine((data) => data.endDate > data.startDate, {
        message: "End date must be after start date",
        path: ["endDate"],
    });

export type ICreateBookingPayload = z.infer<typeof createBookingSchema>;
