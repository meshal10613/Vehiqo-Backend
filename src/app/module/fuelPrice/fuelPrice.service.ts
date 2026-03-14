import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import {
    ICreateFuelPricePayload,
    IUpdateFuelPricePayload,
} from "./fuelPrice.interface";

const createFuelPrice = async (payload: ICreateFuelPricePayload) => {
    const isExist = await prisma.fuelPrice.findUnique({
        where: {
            fuelType: payload.fuelType,
        },
    });

    if (isExist) {
        throw new AppError(status.BAD_REQUEST, "Fuel already exist");
    }

    const result = await prisma.fuelPrice.create({
        data: payload,
    });
    return result;
};

const updateFuelPrice = async (
    id: string,
    payload: IUpdateFuelPricePayload,
) => {
    const isExist = await prisma.fuelPrice.findUnique({
        where: {
            id,
        },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Fuel not found");
    }

    const result = await prisma.fuelPrice.update({
        where: {
            id,
        },
        data: {
            pricePerUnit: payload.pricePerUnit,
        },
    });
    return result;
};

const getAllFuelPrice = async () => {
    const result = await prisma.fuelPrice.findMany();
    return result;
};

export const fuelPriceService = {
    createFuelPrice,
    updateFuelPrice,
    getAllFuelPrice,
};
