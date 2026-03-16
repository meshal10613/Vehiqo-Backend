import status from "http-status";
import { VehicleStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    ICreateBookingPayload,
    IUpdateBookingPayload,
} from "./booking.validation";
import { Prisma } from "../../../generated/prisma/client";
import { differenceInCalendarDays } from "date-fns";

const createBooking = async (
    payload: ICreateBookingPayload,
    user: IRequestUser,
) => {
    const { vehicleId, startDate, endDate, advanceAmount, ...rest } = payload;

    const start = new Date(startDate);
    const end   = new Date(endDate);

    // ── 1. Fetch vehicle + user in parallel ───────────────────────────────────
    // Original code fired 3 sequential queries (vehicle → user → create+update).
    // Promise.all runs the two independent reads concurrently, cutting wait time
    // roughly in half before we even touch the write path.
    const [vehicle, customer] = await Promise.all([
        prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: {
                status:      true,
                pricePerDay: true,
                vehicleType: {
                    select: { requiresLicense: true },
                },
            },
        }),
        prisma.user.findUnique({
            where: { id: user.userId },
            select: { licenseNumber: true },
        }),
    ]);

    // ── 2. Guard: vehicle exists & available ──────────────────────────────────
    if (!vehicle) {
        throw new AppError(status.NOT_FOUND, "Vehicle not found");
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
        throw new AppError(
            status.CONFLICT,
            "Vehicle is not available for booking",
        );
    }

    if (vehicle.vehicleType.requiresLicense && !customer?.licenseNumber) {
        throw new AppError(
            status.BAD_REQUEST,
            "A valid license is required to book this vehicle",
        );
    }

    const totalDays = differenceInCalendarDays(end, start);
    const baseCost  = vehicle.pricePerDay * totalDays;

    const [booking] = await prisma.$transaction([
        prisma.booking.create({
            data: {
                startDate:    start,
                endDate:      end,
                pricePerDay:  vehicle.pricePerDay,
                totalDays,
                baseCost,
                totalCost:    baseCost,   // no surcharges yet at booking time
                remainingDue: baseCost - (advanceAmount ?? 0),
                advanceAmount: advanceAmount ?? 0,
                vehicleId,
                customerId:   user.userId,
                ...rest,
            },
        }),
        prisma.vehicle.update({
            where: { id: vehicleId },
            data:  { status: VehicleStatus.BOOKED },
        }),
    ]);

    return booking;
};

const getAllBooking = async () => {
    const result = await prisma.booking.findMany({
        include: {
            vehicle: {
                include: {
                    vehicleType: true,
                    fuel: true,
                },
            },
            customer: true,
        },
    });
    return result;
};

const getMyBooking = async (user: IRequestUser) => {
    const result = await prisma.booking.findMany({
        where: {
            customerId: user.userId,
        },
        include: {
            vehicle: {
                include: {
                    vehicleType: true,
                    fuel: true,
                },
            },
        },
    });
    return result;
};

export const updateBooking = async (
    bookingId: string,
    payload: IUpdateBookingPayload,
) => {
    // ── 1. Fetch the existing booking ─────────────────────────────────────────
    // We need the full existing record so we can:
    //   a) Confirm the booking exists
    //   b) Fall back to stored values for any field not present in the payload
    //      (partial update — only the fields the caller sends should change)
    const existing = await prisma.booking.findUnique({
        where: { id: bookingId },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    // ── 2. Resolve effective values ───────────────────────────────────────────
    // For every field that drives a calculation we "resolve" the effective value:
    //   payload value  →  if the caller sent it, use that (they're updating it)
    //   existing value →  otherwise keep what's already stored in the DB
    //
    // This ensures partial updates stay consistent — e.g. if only endDate is
    // sent, we still have the correct startDate for recalculating totalDays.

    const effectiveStartDate  = payload.startDate    ?? existing.startDate;
    const effectiveEndDate    = payload.endDate      ?? existing.endDate;
    const effectiveReturnedAt = payload.returnedAt   ?? existing.returnedAt ?? null;
    const effectivePricePerDay = payload.pricePerDay ?? existing.pricePerDay;
    const effectiveAdvanceAmount = payload.advanceAmount ?? existing.advanceAmount ?? 0;

    // ── 3. Determine whether a cost recalculation is needed ───────────────────
    // Recalculation is triggered when ANY of these change:
    //   • startDate       — changes the rental window length
    //   • endDate         — changes the rental window length AND the late-fee baseline
    //   • pricePerDay     — changes baseCost, lateFee, and therefore totalCost
    //   • returnedAt      — may introduce or clear a late-fee if it crosses endDate
    //   • advanceAmount   — changes remainingDue
    //   • fuelCharge / fuelCredit / damageCharge — directly affect totalCost
    //
    // If none of the above are in the payload we skip recalculation entirely
    // and just do a plain field update (e.g. updating only `notes` or `status`).
    const needsRecalculation =
        payload.startDate      !== undefined ||
        payload.endDate        !== undefined ||
        payload.pricePerDay    !== undefined ||
        payload.returnedAt     !== undefined ||
        payload.advanceAmount  !== undefined ||
        payload.fuelCharge     !== undefined ||
        payload.fuelCredit     !== undefined ||
        payload.damageCharge   !== undefined;

    // ── 4. Recalculated fields (only populated when needsRecalculation = true) ─
    let computedFields: Partial<{
        totalDays:    number;
        baseCost:     number;
        extraDays:    number;
        lateFee:      number;
        totalCost:    number;
        remainingDue: number;
    }> = {};

    if (needsRecalculation) {

        // ── 4a. Validate resolved date window ─────────────────────────────────
        // Even though Zod already checks the incoming payload, the *resolved*
        // window (mixing payload + existing values) could still be invalid.
        // Example: existing startDate = Aug 10, payload endDate = Aug 5 → invalid.
        if (effectiveStartDate && effectiveEndDate) {
            if (effectiveEndDate <= effectiveStartDate) {
                throw new AppError(
                    status.BAD_REQUEST,
                    "End date must be after start date",
                );
            }
        }

        // ── 4b. totalDays & baseCost ──────────────────────────────────────────
        // totalDays = number of calendar days in the agreed rental window
        //             (from startDate to endDate, NOT including any overstay)
        // baseCost  = totalDays × pricePerDay
        //             (the core rental charge before any surcharges)
        const totalDays =
            effectiveStartDate && effectiveEndDate
                ? differenceInCalendarDays(effectiveEndDate, effectiveStartDate)
                : existing.totalDays; // dates not set yet — keep existing value

        const baseCost = totalDays * effectivePricePerDay;

        // ── 4c. Late fee (extraDays & lateFee) ────────────────────────────────
        // A late fee applies only when the vehicle is returned AFTER the agreed
        // endDate.
        //
        // extraDays = returnedAt − endDate  (calendar days, integer)
        //             only counted when returnedAt > endDate
        //
        // lateFee   = extraDays × pricePerDay × 1.2
        //             The 1.2 multiplier applies a 20% penalty on top of the
        //             normal daily rate for each day of overstay.
        //
        // If the vehicle is returned on time (returnedAt ≤ endDate) both values
        // remain 0 — no late fee is charged.
        let extraDays = 0;
        let lateFee   = 0;

        if (
            effectiveReturnedAt &&
            effectiveEndDate    &&
            effectiveReturnedAt > effectiveEndDate
        ) {
            extraDays = differenceInCalendarDays(
                effectiveReturnedAt,
                effectiveEndDate,
            );
            // 20% penalty rate on overstayed days
            lateFee = extraDays * effectivePricePerDay * 1.2;
        }

        // ── 4d. Other return-time surcharges ──────────────────────────────────
        // These are assessed when the vehicle is returned and recorded on the
        // booking at that point. We resolve them the same way as other fields:
        // payload value if provided, otherwise keep existing stored value.
        //
        // fuelCharge   — charged if vehicle is returned with less fuel than agreed
        // fuelCredit   — credited if vehicle is returned with more fuel than agreed
        // damageCharge — charged if any damage is found on return inspection
        const fuelCharge   = payload.fuelCharge   ?? existing.fuelCharge   ?? 0;
        const fuelCredit   = payload.fuelCredit   ?? existing.fuelCredit   ?? 0;
        const damageCharge = payload.damageCharge ?? existing.damageCharge ?? 0;

        // ── 4e. totalCost ─────────────────────────────────────────────────────
        // The full amount the customer owes for this booking:
        //
        //   totalCost = baseCost
        //             + lateFee       (0 if returned on time)
        //             + fuelCharge    (0 if fuel OK)
        //             + damageCharge  (0 if no damage)
        //             − fuelCredit    (0 if no excess fuel)
        const totalCost =
            baseCost     +
            lateFee      +
            fuelCharge   +
            damageCharge -
            fuelCredit;

        // ── 4f. remainingDue ──────────────────────────────────────────────────
        // The balance still owed after the advance payment is deducted.
        //
        //   remainingDue = totalCost − advanceAmount
        //
        // Math.max(0, ...) ensures it never goes negative — if the advance
        // somehow exceeds totalCost (e.g. after a fuelCredit) the customer
        // owes nothing further (refund logic is handled separately if needed).
        const remainingDue = Math.max(0, totalCost - effectiveAdvanceAmount);

        // ── 4g. Collect all computed fields ───────────────────────────────────
        // These will be merged into the Prisma update below, overwriting any
        // raw payload values for these fields (computed fields always win).
        computedFields = {
            totalDays,
            baseCost,
            extraDays,   // server-computed from returnedAt vs endDate
            lateFee,     // server-computed — never trusted from payload
            totalCost,
            remainingDue,
        };
    }

    // ── 5. Persist the update ─────────────────────────────────────────────────
    // Spread order is intentional:
    //   1. payload       — all fields the caller wants to change
    //   2. computedFields — overrides the computed fields in payload if present
    //                       (extraDays & lateFee must never come from the caller)
    //
    // Fields not in either spread (e.g. vehicleId, customerId) are untouched
    // by Prisma's update — they stay exactly as stored.
    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            ...payload,
            ...computedFields, // computed fields always win over raw payload
        } as Prisma.BookingUpdateInput,
    });

    return updated;
};

export const bookingService = {
    createBooking,
    getAllBooking,
    getMyBooking,
    updateBooking,
};
