import status from "http-status";
import {
    BookingStatus,
    UserRole,
    VehicleStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
    IAdminUpdateBooking,
    ICreateBookingPayload,
    ICustomerUpdateBooking,
} from "./booking.validation";
import { Booking, Prisma } from "../../../generated/prisma/client";
import { differenceInCalendarDays } from "date-fns";
import { IQueryParams } from "../../interface/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
    bookingFilterableFields,
    bookingSearchableFields,
} from "./booking.constant";

// ─────────────────────────────────────────────────────────────────────────────
// createBooking
// ─────────────────────────────────────────────────────────────────────────────
// Flow:
//   1. Validate vehicle is AVAILABLE and customer holds a valid license (if required)
//   2. Compute totalDays / baseCost server-side — never trust the client
//   3. Create the booking in PENDING status
//   4. Vehicle stays AVAILABLE at this point — it only becomes BOOKED after the
//      advance payment webhook confirms (handled in the payment service).
//      This prevents a failed/abandoned Stripe session from locking the vehicle.
// ─────────────────────────────────────────────────────────────────────────────

const createBooking = async (
    payload: ICreateBookingPayload,
    user: IRequestUser,
) => {
    const { vehicleId, startDate, endDate, advanceAmount, notes } = payload;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // ── 1. Fetch vehicle + customer concurrently ──────────────────────────────
    const [vehicle, customer] = await Promise.all([
        prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: {
                status: true,
                pricePerDay: true,
                vehicleType: { select: { requiresLicense: true } },
            },
        }),
        prisma.user.findUnique({
            where: { id: user.userId },
            select: { licenseNumber: true },
        }),
    ]);

    // ── 2. Guards ─────────────────────────────────────────────────────────────
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
            "A valid driver's license is required to book this vehicle",
        );
    }

    // ── 3. Derived fields ─────────────────────────────────────────────────────
    // totalDays uses Math.ceil so a booking from Aug 1 → Aug 1 23:59 still
    // counts as 1 day, not 0.  differenceInCalendarDays already returns an
    // integer, but we keep the Math.max(1, ...) guard for safety.
    const totalDays = Math.max(1, differenceInCalendarDays(end, start));
    const baseCost = vehicle.pricePerDay * totalDays;

    // advanceAmount must not exceed the full base cost
    if (advanceAmount > baseCost) {
        throw new AppError(
            status.BAD_REQUEST,
            `Advance amount (৳${advanceAmount}) cannot exceed total base cost (৳${baseCost})`,
        );
    }

    // ── 4. Persist ────────────────────────────────────────────────────────────
    // Vehicle status is NOT changed here — it changes to BOOKED only after the
    // advance payment webhook confirms (see payment service).
    const booking = await prisma.booking.create({
        data: {
            startDate: start,
            endDate: end,
            pricePerDay: vehicle.pricePerDay,
            totalDays,
            baseCost,
            totalCost: baseCost, // no surcharges yet
            advanceAmount,
            remainingDue: baseCost - advanceAmount,
            notes,
            vehicleId,
            customerId: user.userId,
        },
    });

    await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: VehicleStatus.BOOKED },
    });

    return booking;
};

const getAllBooking = async (query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        Booking,
        Prisma.BookingWhereInput,
        Prisma.BookingInclude
    >(prisma.booking, query, {
        searchableFields: bookingSearchableFields,
        filterableFields: bookingFilterableFields,
    });

    const result = await queryBuilder
        .search()
        .filter()
        .include({
            vehicle: true,
            customer: true,
            payments: true,
        })
        // .dynamicInclude(doctorIncludeConfig)
        .paginate()
        .sort()
        .fields()
        .execute();

    return result;
};

const getMyBooking = async (user: IRequestUser, query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        Booking,
        Prisma.BookingWhereInput,
        Prisma.BookingInclude
    >(prisma.booking, query, {
        searchableFields: bookingSearchableFields,
        filterableFields: bookingFilterableFields,
    });

    const result = await queryBuilder
        .search()
        .filter()
        .where({ customerId: user.userId })
        .include({
            vehicle: true,
            customer: true,
            payments: true,
        })
        // .dynamicInclude(doctorIncludeConfig)
        .paginate()
        .sort()
        .fields()
        .execute();

    return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateBooking
// ─────────────────────────────────────────────────────────────────────────────
// Role-aware: the controller passes the validated payload and the caller's role.
// Admin payload  → IAdminUpdateBooking   (all fields)
// Customer payload → ICustomerUpdateBooking (notes + CANCELLED only)
//
// Business rules enforced here:
//   • Customer cannot cancel once booking is CONFIRMED (advance paid)
//   • extraDays / lateFee are always server-computed — never from payload
//   • fuelLevelReturn triggers automatic fuelCharge / fuelCredit computation
//     if fuelLevelPickup is also present
// ─────────────────────────────────────────────────────────────────────────────

const updateBooking = async (
    bookingId: string,
    payload: IAdminUpdateBooking | ICustomerUpdateBooking,
    callerRole: UserRole,
) => {
    // ── 1. Load existing booking ──────────────────────────────────────────────
    const existing = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { vehicle: { select: { pricePerDay: true } } },
    });

    if (!existing) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    // ── 2. Role-based guards ──────────────────────────────────────────────────

    if (callerRole === UserRole.CUSTOMER) {
        const customerPayload = payload as ICustomerUpdateBooking;

        // Customer can only cancel while still PENDING (before advance is paid)
        if (customerPayload.status === BookingStatus.CANCELLED) {
            if (existing.status !== BookingStatus.PENDING) {
                throw new AppError(
                    status.FORBIDDEN,
                    "Booking cannot be cancelled after the advance payment has been made",
                );
            }

            // On customer cancellation, restore vehicle to AVAILABLE
            const [updated] = await prisma.$transaction([
                prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: BookingStatus.CANCELLED,
                        cancelledAt: new Date(),
                        cancelledBy: existing.customerId,
                        cancellationReason: "Cancelled by customer",
                        notes: customerPayload.notes ?? existing.notes,
                    },
                }),
                prisma.vehicle.update({
                    where: { id: existing.vehicleId },
                    data: { status: VehicleStatus.AVAILABLE },
                }),
            ]);

            return updated;
        }

        if (customerPayload.status === BookingStatus.PICKED_UP) {
            const [updated] = await prisma.$transaction([
                prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: BookingStatus.PICKED_UP,
                        pickedUpAt: payload.pickedUpAt ?? new Date(),
                    },
                }),
                prisma.vehicle.update({
                    where: { id: existing.vehicleId },
                    data: { status: VehicleStatus.RENTED },
                }),
            ]);

            return updated;
        }

        if (customerPayload.status === BookingStatus.RETURNED) {
            const returnedAt = customerPayload.returnedAt
                ? new Date(customerPayload.returnedAt)
                : new Date();

            const pickupAnchor = existing.pickedUpAt
                ? new Date(existing.pickedUpAt)
                : new Date(existing.startDate);

            // ── Total days: minimum 1 regardless of how soon customer returns ─────
            const rawDays = differenceInCalendarDays(returnedAt, pickupAnchor);
            const totalDays = Math.max(1, rawDays);

            const pricePerDay = existing.pricePerDay;
            const baseCost = totalDays * pricePerDay;

            // ── Late fee: each day beyond endDate → 1.2 × pricePerDay ────────────
            let extraDays = 0;
            let lateFee = 0;

            if (returnedAt > new Date(existing.endDate)) {
                extraDays = differenceInCalendarDays(
                    returnedAt,
                    new Date(existing.endDate),
                );
                lateFee = extraDays * pricePerDay * 1.2;
            }

            // ── Preserve existing fuel/damage values — admin handles these later ──
            const fuelCharge = existing.fuelCharge ?? 0;
            const fuelCredit = existing.fuelCredit ?? 0;
            const damageCharge = existing.damageCharge ?? 0;
            const advanceAmount = existing.advanceAmount ?? 0;

            // ── Final totals ──────────────────────────────────────────────────────
            const totalCost =
                baseCost + lateFee + fuelCharge + damageCharge - fuelCredit;
            const remainingDue = Math.max(0, totalCost - advanceAmount);

            if (remainingDue === 0) {
                const [updated] = await prisma.$transaction([
                    prisma.booking.update({
                        where: { id: bookingId },
                        data: {
                            status: BookingStatus.COMPLETED,
                            returnedAt,
                            totalDays,
                            baseCost,
                            extraDays,
                            lateFee,
                            fuelCharge,
                            fuelCredit,
                            damageCharge,
                            totalCost,
                            remainingDue,
                            notes: customerPayload.notes ?? existing.notes,
                        },
                    }),
                    prisma.vehicle.update({
                        where: { id: existing.vehicleId },
                        data: { status: VehicleStatus.MAINTENANCE },
                    }),
                ]);

                return updated;
            }

            const [updated] = await prisma.$transaction([
                prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: BookingStatus.RETURNED,
                        returnedAt,
                        totalDays,
                        baseCost,
                        extraDays,
                        lateFee,
                        fuelCharge,
                        fuelCredit,
                        damageCharge,
                        totalCost,
                        remainingDue,
                        notes: customerPayload.notes ?? existing.notes,
                    },
                }),
                prisma.vehicle.update({
                    where: { id: existing.vehicleId },
                    data: { status: VehicleStatus.MAINTENANCE },
                }),
            ]);

            return updated;
        }

        // For non-cancel customer updates (notes only), just patch and return
        return prisma.booking.update({
            where: { id: bookingId },
            data: { notes: customerPayload.notes },
        });
    }

    // ── 3. Admin update path ──────────────────────────────────────────────────
    const adminPayload = payload as IAdminUpdateBooking;

    // ── 3a. Resolve effective values (payload ?? existing) ────────────────────
    const effectiveStartDate = adminPayload.startDate ?? existing.startDate;
    const effectiveEndDate = adminPayload.endDate ?? existing.endDate;
    const effectiveReturnedAt =
        adminPayload.returnedAt ?? existing.returnedAt ?? null;
    const effectivePricePerDay =
        adminPayload.pricePerDay ?? existing.pricePerDay;
    const effectiveAdvance =
        adminPayload.advanceAmount ?? existing.advanceAmount ?? 0;

    // Fuel levels — use payload if provided, fall back to what's stored
    const effectiveFuelPickup =
        adminPayload.fuelLevelPickup ??
        (existing as any).fuelLevelPickup ??
        null;
    const effectiveFuelReturn =
        adminPayload.fuelLevelReturn ??
        (existing as any).fuelLevelReturn ??
        null;

    // ── 3b. Decide if recalculation is needed ─────────────────────────────────
    const needsRecalculation =
        adminPayload.startDate !== undefined ||
        adminPayload.endDate !== undefined ||
        adminPayload.pricePerDay !== undefined ||
        adminPayload.returnedAt !== undefined ||
        adminPayload.advanceAmount !== undefined ||
        adminPayload.fuelLevelPickup !== undefined ||
        adminPayload.fuelLevelReturn !== undefined ||
        adminPayload.fuelCharge !== undefined ||
        adminPayload.fuelCredit !== undefined ||
        adminPayload.damageCharge !== undefined;

    let computedFields: Prisma.BookingUpdateInput = {};

    if (needsRecalculation) {
        // ── 3c. Validate resolved window ──────────────────────────────────────
        if (effectiveEndDate <= effectiveStartDate) {
            throw new AppError(
                status.BAD_REQUEST,
                "End date must be after start date",
            );
        }

        // ── 3d. totalDays & baseCost ──────────────────────────────────────────
        const totalDays = Math.max(
            1,
            differenceInCalendarDays(effectiveEndDate, effectiveStartDate),
        );
        const baseCost = totalDays * effectivePricePerDay;

        // ── 3e. Late fee ──────────────────────────────────────────────────────
        // Charged only when returnedAt > endDate (overstay).
        // 20% penalty rate: extraDays × pricePerDay × 1.2
        let extraDays = 0;
        let lateFee = 0;

        if (effectiveReturnedAt && effectiveReturnedAt > effectiveEndDate) {
            extraDays = differenceInCalendarDays(
                effectiveReturnedAt,
                effectiveEndDate,
            );
            lateFee = extraDays * effectivePricePerDay * 1.2;
        }

        // ── 3f. Fuel charge / credit ──────────────────────────────────────────
        // If both fuel levels are known we auto-compute the charge/credit.
        // Admin can still override by passing explicit fuelCharge / fuelCredit.
        //
        // fuelCharge  → customer returned LESS fuel than they received
        // fuelCredit  → customer returned MORE fuel than they received
        //
        // Rate: pricePerDay × 0.1 per percentage point of fuel difference
        // (adjust the multiplier to match your fuel pricing policy)
        let fuelCharge = adminPayload.fuelCharge ?? existing.fuelCharge ?? 0;
        let fuelCredit = adminPayload.fuelCredit ?? existing.fuelCredit ?? 0;
        const damageCharge =
            adminPayload.damageCharge ?? existing.damageCharge ?? 0;

        if (
            effectiveFuelPickup !== null &&
            effectiveFuelReturn !== null &&
            // Only auto-compute if admin didn't explicitly pass charge/credit values
            adminPayload.fuelCharge === undefined &&
            adminPayload.fuelCredit === undefined
        ) {
            const diff = effectiveFuelReturn - effectiveFuelPickup; // positive = more returned
            const ratePerPercent = effectivePricePerDay * 0.1;

            if (diff < 0) {
                // Returned with less fuel → charge the customer
                fuelCharge = Math.abs(diff) * 100 * ratePerPercent;
                fuelCredit = 0;
            } else if (diff > 0) {
                // Returned with more fuel → credit the customer
                fuelCredit = diff * 100 * ratePerPercent;
                fuelCharge = 0;
            } else {
                fuelCharge = 0;
                fuelCredit = 0;
            }
        }

        // ── 3g. totalCost & remainingDue ──────────────────────────────────────
        const totalCost =
            baseCost + lateFee + fuelCharge + damageCharge - fuelCredit;

        const remainingDue = Math.max(0, totalCost - effectiveAdvance);

        computedFields = {
            totalDays,
            baseCost,
            extraDays,
            lateFee,
            fuelCharge,
            fuelCredit,
            damageCharge,
            totalCost,
            remainingDue,
        };
    }

    // ── 3h. Handle admin cancellation ─────────────────────────────────────────
    // When admin cancels, restore the vehicle to AVAILABLE regardless of
    // current booking status.
    if (adminPayload.status === BookingStatus.CANCELLED) {
        const [updated] = await prisma.$transaction([
            prisma.booking.update({
                where: { id: bookingId },
                data: {
                    ...adminPayload,
                    ...computedFields,
                    cancelledAt: adminPayload.cancelledAt ?? new Date(),
                    cancellationReason:
                        adminPayload.cancellationReason ?? "Cancelled by admin",
                } as Prisma.BookingUpdateInput,
            }),
            prisma.vehicle.update({
                where: { id: existing.vehicleId },
                data: { status: VehicleStatus.AVAILABLE },
            }),
        ]);
        return updated;
    }

    // ── 3i. Standard admin update ─────────────────────────────────────────────
    // Spread order: payload first, then computedFields — computed always wins.
    // extraDays and lateFee from the payload are silently overridden this way.
    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            ...adminPayload,
            ...computedFields, // computed fields always win
        } as Prisma.BookingUpdateInput,
    });

    return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// getSingleBooking
// ─────────────────────────────────────────────────────────────────────────────

const getSingleBooking = async (bookingId: string, user: IRequestUser) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            vehicle: true,
            customer: true,
            payments: true,
        },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    // Customers can only see their own bookings
    if (user.role === UserRole.CUSTOMER && booking.customerId !== user.userId) {
        throw new AppError(
            status.FORBIDDEN,
            "You do not have access to this booking",
        );
    }

    return booking;
};

// ─────────────────────────────────────────────────────────────────────────────

export const bookingService = {
    createBooking,
    getAllBooking,
    getMyBooking,
    getSingleBooking,
    updateBooking,
};
