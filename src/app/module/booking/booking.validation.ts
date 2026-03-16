import z from "zod";
import { BookingStatus } from "../../../generated/prisma/enums";

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

export const updateBookingSchema = z
    .object({
        status: z.nativeEnum(BookingStatus).optional(),

        // ── Schedule ──────────────────────────────────────────────
        startDate: z.coerce
            .date()
            .refine((date) => date > new Date(), {
                message: "Start date must be in the future",
            })
            .optional(),
        endDate: z.coerce.date().optional(),

        // ── Lifecycle timestamps ──────────────────────────────────
        pickedUpAt: z.coerce.date().optional(),
        returnedAt: z.coerce.date().optional(),

        // ── Pricing ───────────────────────────────────────────────
        pricePerDay: z.number().positive().optional(),
        advanceAmount: z.number().min(500).optional(),

        // ── Return charges ────────────────────────────────────────
        extraDays: z.number().int().min(0).optional(),
        lateFee: z.number().min(0).optional(),
        fuelCharge: z.number().min(0).optional(),
        fuelCredit: z.number().min(0).optional(),
        damageCharge: z.number().min(0).optional(),

        // ── General ───────────────────────────────────────────────
        notes: z.string().max(500).optional(),
    })
    .refine(
        (data) => {
            if (data.startDate && data.endDate) {
                return data.endDate > data.startDate;
            }
            return true;
        },
        {
            message: "End date must be after start date",
            path: ["endDate"],
        },
    )
    .refine(
        (data) => {
            if (data.pickedUpAt && data.returnedAt) {
                return data.returnedAt > data.pickedUpAt;
            }
            return true;
        },
        {
            message: "Returned date must be after picked up date",
            path: ["returnedAt"],
        },
    );

export type ICreateBookingPayload = z.infer<typeof createBookingSchema>;

export type IUpdateBookingPayload = z.infer<typeof updateBookingSchema>;
