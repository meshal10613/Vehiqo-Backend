import status from "http-status";
import { VehicleStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { ICreateBookingPayload } from "./booking.validation";

const createBooking = async (
    payload: ICreateBookingPayload,
    user: IRequestUser,
) => {
    const { vehicleId, startDate, endDate, advanceAmount, ...rest } = payload;
    const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
            vehicleType: true,
        },
    });

    if (!vehicle) {
        throw new AppError(status.NOT_FOUND, "Vehicle not found");
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
        throw new AppError(
            status.CONFLICT,
            "Vehicle is not available for booking",
        );
    }

    const isExistUser = await prisma.user.findUnique({
        where: {
            id: user.userId,
        },
    });

    if (
        (!isExistUser?.licenseNumber || !isExistUser?.licenseNumber === null) &&
        vehicle.vehicleType.requiresLicense
    ) {
        throw new AppError(status.BAD_REQUEST, "User need license to booking");
    }

    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const baseCost = vehicle.pricePerDay * totalDays;

    const result = await prisma.booking.create({
        data: {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            pricePerDay: vehicle.pricePerDay,
            totalDays,
            baseCost,
            totalCost: baseCost,
            remainingDue: baseCost,
            advanceAmount: advanceAmount,
            vehicleId: vehicleId,
            customerId: user.userId,
            ...rest,
        },
    });
    return result;
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

export const bookingService = {
    createBooking,
    getAllBooking,
    getMyBooking,
};
