import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import {
    ICreateVehicleCategoryPayload,
    IUpdateVehicleCategoryPayload,
} from "./vehicelCategory.validation";

const createVehicleCategory = async (
    payload: ICreateVehicleCategoryPayload,
) => {
    const isExist = await prisma.vehicleCategory.findUnique({
        where: {
            name: payload.name,
        },
    });

    if (isExist) {
        throw new AppError(
            status.BAD_REQUEST,
            "Vehicle category already exist",
        );
    }

    const result = await prisma.vehicleCategory.create({
        data: payload,
    });
    return result;
};

const getAllVehicleCategory = async () => {
    const result = await prisma.vehicleCategory.findMany();

    return result;
};

const getVehicleCategoryById = async (id: string) => {
    const result = await prisma.vehicleCategory.findUnique({
        where: { id },
    });

    if (!result) {
        throw new AppError(status.NOT_FOUND, "Vehicle category not found");
    }

    return result;
};

const updateVehicleCategory = async (
    id: string,
    payload: IUpdateVehicleCategoryPayload,
) => {
    const isExist = await prisma.vehicleCategory.findUnique({
        where: { id },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Vehicle category not found");
    }

    const result = await prisma.vehicleCategory.update({
        where: { id },
        data: payload,
    });

    return result;
};

const deleteVehicleCategory = async (id: string) => {
    const isExist = await prisma.vehicleCategory.findUnique({
        where: { id },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Vehicle category not found");
    }

    const result = await prisma.vehicleCategory.delete({
        where: { id },
    });

    return result;
};

export const vehicleCategoryService = {
    createVehicleCategory,
	getAllVehicleCategory,
	getVehicleCategoryById,
	updateVehicleCategory,
	deleteVehicleCategory
};
