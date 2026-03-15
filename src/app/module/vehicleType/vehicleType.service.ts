import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateVehicleTypePayload, IUpdateVehicleTypePayload } from "./vehicleType.validation";
import { deleteFileFromCloudinary } from "../../config/cloudinary";

const createVehicleType = async (payload: ICreateVehicleTypePayload) => {
    const isExist = await prisma.vehicleType.findUnique({
        where: {
            name: payload.name,
        },
    });

    if (isExist) {
        throw new AppError(status.BAD_REQUEST, "Vehicle type already exist");
    }

    const result = await prisma.vehicleType.create({
        data: payload,
    });
    return result;
};

const getAllVehicleTypes = async () => {
    const result = await prisma.vehicleType.findMany({
        include: {
            category: true,
        },
    });

    return result;
};

const getVehicleTypeById = async (id: string) => {
    const result = await prisma.vehicleType.findUnique({
        where: { id },
        include: {
            category: true,
        },
    });

    if (!result) {
        throw new AppError(status.NOT_FOUND, "Vehicle type not found");
    }

    return result;
};

const updateVehicleType = async (
    id: string,
    payload: IUpdateVehicleTypePayload,
) => {
    const isExist = await prisma.vehicleType.findUnique({
        where: { id },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Vehicle type not found");
    }

    // If categoryId is provided, verify it exists
    if (payload.categoryId) {
        const categoryExists = await prisma.vehicleCategory.findUnique({
            where: { id: payload.categoryId },
        });

        if (!categoryExists) {
            throw new AppError(
                status.NOT_FOUND,
                "Vehicle category not found for the provided categoryId",
            );
        }
    }

    // If new image is coming and old image exists → delete old from Cloudinary
    if (payload.image && isExist.image) {
        await deleteFileFromCloudinary(isExist.image);
    }

    const result = await prisma.vehicleType.update({
        where: { id },
        data: payload,
        include: {
            category: true,
        },
    });

    return result;
};

const deleteVehicleType = async (id: string) => {
    const isExist = await prisma.vehicleType.findUnique({
        where: { id },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Vehicle type not found");
    }

    // Delete image from Cloudinary if exists
    if (isExist.image) {
        await deleteFileFromCloudinary(isExist.image);
    }

    await prisma.vehicleType.delete({
        where: { id },
    });
};

export const vehicleTypeService = {
    createVehicleType,
    getAllVehicleTypes,
    getVehicleTypeById,
    updateVehicleType,
    deleteVehicleType,
};
