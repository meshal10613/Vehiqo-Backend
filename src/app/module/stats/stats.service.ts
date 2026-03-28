import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";
import {
    BookingStatus,
    Fuel,
    PaymentMethod,
    PaymentStatus,
    PaymentType,
    Transmission,
    UserRole,
    VehicleStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const getStats = async (user: IRequestUser) => {
    let statsData;

    switch (user.role) {
        case UserRole.ADMIN:
            statsData = getAdminStatsData();
            break;
        case UserRole.CUSTOMER:
            statsData = getCustomerStatsData(user);
            break;
        default:
            throw new AppError(status.BAD_REQUEST, "Invalid user role");
    }

    return statsData;
};

const getAdminStatsData = async () => {
    const [
        fuelPrice,

        userStats,

        reviewCount,
        vehicleCategoryCount,
        vehicleTypeCount,

        vehicleStatusStats,
        vehicleTransmissionStats,
        vehicleFuelStats,
        vehicleCount,

        bookingStats,
        bookingCount,

        paymentStatusStats,
        paymentTypeStats,
        paymentMethodStats,
        paymentCount,
    ] = await Promise.all([
        prisma.fuelPrice.findMany({
            select: {
                fuelType: true,
                pricePerUnit: true,
                unit: true,
            },
        }),

        prisma.user.groupBy({
            by: ["role"],
            _count: true,
        }),

        prisma.review.count(),
        prisma.vehicleCategory.count(),
        prisma.vehicleType.count(),

        prisma.vehicle.groupBy({
            by: ["status"],
            _count: true,
        }),

        prisma.vehicle.groupBy({
            by: ["transmission"],
            _count: true,
        }),

        prisma.vehicle.groupBy({
            by: ["fuelType"],
            _count: true,
        }),

        prisma.vehicle.count(),

        prisma.booking.groupBy({
            by: ["status"],
            _count: true,
        }),

        prisma.booking.count(),

        prisma.payment.groupBy({
            by: ["status"],
            _count: true,
        }),

        prisma.payment.groupBy({
            by: ["type"],
            _count: true,
        }),

        prisma.payment.groupBy({
            by: ["method"],
            _count: true,
        }),

        prisma.payment.count(),
    ]);

    // helper to map groupBy → object
    const mapCounts = (arr: any[], key: string) =>
        Object.fromEntries(arr.map((item) => [item[key], item._count]));

    const userMap = mapCounts(userStats, "role");
    const vehicleStatusMap = mapCounts(vehicleStatusStats, "status");
    const vehicleTransmissionMap = mapCounts(
        vehicleTransmissionStats,
        "transmission",
    );
    const vehicleFuelMap = mapCounts(vehicleFuelStats, "fuelType");
    const bookingMap = mapCounts(bookingStats, "status");
    const paymentStatusMap = mapCounts(paymentStatusStats, "status");
    const paymentTypeMap = mapCounts(paymentTypeStats, "type");
    const paymentMethodMap = mapCounts(paymentMethodStats, "method");

    return {
        fuelPrice,

        user: {
            user: (userMap.CUSTOMER || 0) + (userMap.ADMIN || 0),
            admin: userMap.ADMIN || 0,
            customer: userMap.CUSTOMER || 0,
        },

        review: reviewCount,
        vehicleCategory: vehicleCategoryCount,
        vehicleType: vehicleTypeCount,

        vehicle: {
            total: vehicleCount,

            transmission: {
                manual: vehicleTransmissionMap.MANUAL || 0,
                automatic: vehicleTransmissionMap.AUTOMATIC || 0,
                semi_automatic: vehicleTransmissionMap.SEMI_AUTOMATIC || 0,
                none: vehicleTransmissionMap.NONE || 0,
            },

            status: {
                available: vehicleStatusMap.AVAILABLE || 0,
                booked: vehicleStatusMap.BOOKED || 0,
                maintenance: vehicleStatusMap.MAINTENANCE || 0,
                rented: vehicleStatusMap.RENTED || 0,
                retired: vehicleStatusMap.RETIRED || 0,
            },

            fuel: {
                petrol: vehicleFuelMap.PETROL || 0,
                octane: vehicleFuelMap.OCTANE || 0,
                diesel: vehicleFuelMap.DIESEL || 0,
                hybrid: vehicleFuelMap.HYBRID || 0,
                cng: vehicleFuelMap.CNG || 0,
                electric: vehicleFuelMap.ELECTRIC || 0,
            },
        },

        booking: {
            total: bookingCount,
            status: {
                pending: bookingMap.PENDING || 0,
                advancePaid: bookingMap.ADVANCE_PAID || 0,
                pickedUp: bookingMap.PICKED_UP || 0,
                returned: bookingMap.RETURNED || 0,
                cancelled: bookingMap.CANCELLED || 0,
                completed: bookingMap.COMPLETED || 0,
            },
        },

        payment: {
            total: paymentCount,

            status: {
                unpaid: paymentStatusMap.UNPAID || 0,
                pending: paymentStatusMap.PENDING || 0,
                paid: paymentStatusMap.PAID || 0,
                failed: paymentStatusMap.FAILED || 0,
                refunded: paymentStatusMap.REFUNDED || 0,
            },

            type: {
                advance: paymentTypeMap.ADVANCE || 0,
                final: paymentTypeMap.FINAL || 0,
                full: paymentTypeMap.FULL || 0,
                refund: paymentTypeMap.REFUND || 0,
            },

            method: {
                cash: paymentMethodMap.CASH || 0,
                stripe: paymentMethodMap.STRIPE || 0,
                sslcommerz: paymentMethodMap.SSLCOMMERZ || 0,
                bkash: paymentMethodMap.BKASH || 0,
                nogod: paymentMethodMap.NOGOD || 0,
            },
        },
    };
};

const getCustomerStatsData = async (user: IRequestUser) => {
    const userId = user.userId;

    const [
        fuelPrice,
        bookingStats,
        bookingCount,

        paymentStatusStats,
        paymentTypeStats,
        paymentMethodStats,
        paymentCount,

        totalSpent,

        reviewStats,
    ] = await Promise.all([
        prisma.fuelPrice.findMany({
            select: {
                fuelType: true,
                pricePerUnit: true,
                unit: true,
            },
        }),

        prisma.booking.groupBy({
            by: ["status"],
            where: {
                customerId: userId,
            },
            _count: true,
        }),

        prisma.booking.count({
            where: { customerId: userId },
        }),

        prisma.payment.groupBy({
            by: ["status"],
            where: {
                booking: {
                    customerId: userId,
                },
            },
            _count: true,
        }),

        prisma.payment.groupBy({
            by: ["type"],
            where: {
                booking: {
                    customerId: userId,
                },
            },
            _count: true,
        }),

        prisma.payment.groupBy({
            by: ["method"],
            where: {
                booking: {
                    customerId: userId,
                },
            },
            _count: true,
        }),

        prisma.payment.count({
            where: {
                booking: {
                    customerId: userId,
                },
            },
        }),

        prisma.payment.aggregate({
            where: {
                status: PaymentStatus.PAID,
                booking: {
                    customerId: userId,
                },
            },
            _sum: {
                amount: true,
            },
        }),
        prisma.review.aggregate({
            where: {
                userId: userId,
            },
            _count: true,
        }),
    ]);

    // helper
    const mapCounts = (arr: any[], key: string) =>
        Object.fromEntries(arr.map((item) => [item[key], item._count]));

    const bookingMap = mapCounts(bookingStats, "status");
    const paymentStatusMap = mapCounts(paymentStatusStats, "status");
    const paymentTypeMap = mapCounts(paymentTypeStats, "type");
    const paymentMethodMap = mapCounts(paymentMethodStats, "method");

    return {
        fuelPrice,
        booking: {
            total: bookingCount,
            status: {
                pending: bookingMap.PENDING || 0,
                advancePaid: bookingMap.ADVANCE_PAID || 0,
                pickedUp: bookingMap.PICKED_UP || 0,
                returned: bookingMap.RETURNED || 0,
                cancelled: bookingMap.CANCELLED || 0,
                completed: bookingMap.COMPLETED || 0,
            },
        },

        payment: {
            total: paymentCount,

            status: {
                unpaid: paymentStatusMap.UNPAID || 0,
                pending: paymentStatusMap.PENDING || 0,
                paid: paymentStatusMap.PAID || 0,
                failed: paymentStatusMap.FAILED || 0,
                refunded: paymentStatusMap.REFUNDED || 0,
            },

            type: {
                advance: paymentTypeMap.ADVANCE || 0,
                final: paymentTypeMap.FINAL || 0,
                full: paymentTypeMap.FULL || 0,
                refund: paymentTypeMap.REFUND || 0,
            },

            method: {
                cash: paymentMethodMap.CASH || 0,
                stripe: paymentMethodMap.STRIPE || 0,
                sslcommerz: paymentMethodMap.SSLCOMMERZ || 0,
                bkash: paymentMethodMap.BKASH || 0,
                nogod: paymentMethodMap.NOGOD || 0,
            },

            totalSpent: totalSpent._sum.amount || 0,
        },
        review: {
            total: reviewStats._count || 0,
        },
    };
};

const getPublicStats = async () => {
    const [vehicleType, vehicleCategory, vehicle, review] = await Promise.all([
        prisma.vehicleType.count(),
        prisma.vehicleCategory.count(),
        prisma.vehicle.count(),
        prisma.review.count(),
    ]);

    return {
        vehicleType,
        vehicleCategory,
        vehicle,
        review,
    };
};

export const statsService = { getStats, getPublicStats };
