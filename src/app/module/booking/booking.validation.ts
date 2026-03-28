import z from "zod";
import { BookingStatus } from "../../../generated/prisma/enums";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Start-of-today in UTC — gives a small buffer so a booking submitted at
 *  11:59 pm for "tomorrow midnight" doesn't fail due to millisecond drift. */
const startOfToday = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

// ─────────────────────────────────────────────────────────────────────────────
// Create booking  (Customer)
// ─────────────────────────────────────────────────────────────────────────────

export const createBookingSchema = z
    .object({
        vehicleId: z.string().uuid("Invalid vehicle ID"),

        startDate: z.coerce
            .date({ message: "Start date is required" })
            .refine((d) => d >= startOfToday(), {
                // Compare against start-of-today, not Date.now(), to avoid
                // millisecond-level false rejections for "today" bookings.
                message: "Start date must be today or in the future",
            }),

        endDate: z.coerce.date({ message: "End date is required" }),

        // Minimum advance is 200 BDT (business rule)
        advanceAmount: z
            .number({ message: "Advance amount is required" })
            .min(200, "Advance amount must be at least ৳200"),

        notes: z.string().max(500).optional(),
    })
    .refine((data) => data.endDate > data.startDate, {
        message: "End date must be after start date",
        path: ["endDate"],
    })
    .refine(
        (data) => {
            // Guard against same-day bookings producing totalDays = 0.
            // differenceInCalendarDays(end, start) must be >= 1.
            const ms = data.endDate.getTime() - data.startDate.getTime();
            return ms >= 24 * 60 * 60 * 1000; // at least 1 full day
        },
        {
            message: "Booking must be for at least 1 day",
            path: ["endDate"],
        },
    );

// ─────────────────────────────────────────────────────────────────────────────
// Update booking — admin fields
// Admin can update anything: lifecycle timestamps, pricing, return charges,
// fuel levels, cancellation, notes.
// ─────────────────────────────────────────────────────────────────────────────

export const adminUpdateBookingSchema = z
    .object({
        status: z.nativeEnum(BookingStatus).optional(),

        // ── Schedule ──────────────────────────────────────────────────────────
        startDate: z.coerce
            .date()
            .refine((d) => d >= startOfToday(), {
                message: "Start date must be today or in the future",
            })
            .optional(),
        endDate: z.coerce.date().optional(),

        // ── Lifecycle timestamps ──────────────────────────────────────────────
        pickedUpAt: z.coerce.date().optional(),
        returnedAt: z.coerce.date().optional(),

        // ── Pricing ───────────────────────────────────────────────────────────
        pricePerDay: z.number().positive().optional(),
        advanceAmount: z.number().min(200).optional(),

        // ── Fuel levels (recorded at handover & return) ───────────────────────
        // Values are a fraction: 0.0 = empty, 1.0 = full
        fuelLevelPickup: z.number().min(0).max(1).optional(),
        fuelLevelReturn: z.number().min(0).max(1).optional(),

        // ── Return surcharges (server-computed, but admin can set the inputs) ──
        // extraDays and lateFee are intentionally excluded — they are always
        // derived from returnedAt vs endDate in the service layer.
        fuelCharge: z.number().min(0).optional(),
        fuelCredit: z.number().min(0).optional(),
        damageCharge: z.number().min(0).optional(),

        // ── Cancellation ──────────────────────────────────────────────────────
        cancelledAt: z.coerce.date().optional(),
        cancelledBy: z.string().uuid().optional(),
        cancellationReason: z.string().max(500).optional(),

        // ── General ───────────────────────────────────────────────────────────
        notes: z.string().max(500).optional(),
    })
    // Cross-field: dates must be consistent
    .refine(
        (data) => {
            if (data.startDate && data.endDate) {
                return data.endDate > data.startDate;
            }
            return true;
        },
        { message: "End date must be after start date", path: ["endDate"] },
    )
    .refine(
        (data) => {
            if (data.pickedUpAt && data.returnedAt) {
                return data.returnedAt > data.pickedUpAt;
            }
            return true;
        },
        {
            message: "Returned date must be after picked-up date",
            path: ["returnedAt"],
        },
    )
    // Fuel levels: return level without pickup level is ambiguous
    .refine(
        (data) => {
            if (
                data.fuelLevelReturn !== undefined &&
                data.fuelLevelPickup === undefined
            ) {
                return false;
            }
            return true;
        },
        {
            message: "fuelLevelPickup must be set before fuelLevelReturn",
            path: ["fuelLevelReturn"],
        },
    );

// ─────────────────────────────────────────────────────────────────────────────
// Update booking — customer fields
// Customer can only update notes, OR cancel (only while still PENDING).
// They cannot touch pricing, timestamps, charges, or fuel levels.
// ─────────────────────────────────────────────────────────────────────────────

export const customerUpdateBookingSchema = z.object({
    notes: z.string().max(500).optional(),
    status: z
        .nativeEnum(BookingStatus)
        .optional(),
    pickedUpAt: z.coerce.date().optional(),
    returnedAt: z.coerce.date().optional(),
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Exported types
// ─────────────────────────────────────────────────────────────────────────────

export type ICreateBookingPayload = z.infer<typeof createBookingSchema>;
export type IAdminUpdateBooking = z.infer<typeof adminUpdateBookingSchema>;
export type ICustomerUpdateBooking = z.infer<
    typeof customerUpdateBookingSchema
>;

// Union used in the service — resolved by the caller (controller/route)
export type IUpdateBookingPayload =
    | IAdminUpdateBooking
    | ICustomerUpdateBooking;
