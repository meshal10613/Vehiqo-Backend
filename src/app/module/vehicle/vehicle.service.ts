import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import { deleteFileFromCloudinary } from "../../config/cloudinary";
import {
    ICreateVehiclePayload,
    IUpdateVehiclePayload,
} from "./vehicle.validation";

const createVehicle = async (payload: ICreateVehiclePayload) => {
    // Check vehicle type exists
    const vehicleType = await prisma.vehicleType.findUnique({
        where: { id: payload.vehicleTypeId },
    });

    if (!vehicleType) {
        throw new AppError(status.NOT_FOUND, "Vehicle type not found");
    }

    // Check fuel price exists for the given fuelType
    const fuelPrice = await prisma.fuelPrice.findUnique({
        where: { fuelType: payload.fuelType },
    });

    if (!fuelPrice) {
        throw new AppError(
            status.NOT_FOUND,
            "Fuel price not found for the given fuel type",
        );
    }

    // Check plate number is unique
    const plateExists = await prisma.vehicle.findUnique({
        where: { plateNo: payload.plateNo },
    });

    if (plateExists) {
        throw new AppError(
            status.BAD_REQUEST,
            "Vehicle with this plate number already exists",
        );
    }

    const result = await prisma.vehicle.create({
        data: payload,
        include: {
            vehicleType: {
                include: { category: true },
            },
            fuel: true,
        },
    });

    return result;
};

const getAllVehicles = async () => {
    const result = await prisma.vehicle.findMany({
        include: {
            vehicleType: {
                include: { category: true },
            },
            fuel: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return result;
};

const getVehicleById = async (id: string) => {
    const result = await prisma.vehicle.findUnique({
        where: { id },
        include: {
            vehicleType: {
                include: { category: true },
            },
            fuel: true,
            reviews: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            },
        },
    });

    if (!result) {
        throw new AppError(status.NOT_FOUND, "Vehicle not found");
    }

    return result;
};

const updateVehicle = async (id: string, payload: IUpdateVehiclePayload) => {
    const isExist = await prisma.vehicle.findUnique({
        where: { id },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Vehicle not found");
    }

    // If vehicleTypeId is provided, verify it exists
    if (payload.vehicleTypeId) {
        const vehicleType = await prisma.vehicleType.findUnique({
            where: { id: payload.vehicleTypeId },
        });

        if (!vehicleType) {
            throw new AppError(status.NOT_FOUND, "Vehicle type not found");
        }
    }

    // If fuelType is provided, verify fuel price exists
    if (payload.fuelType) {
        const fuelPrice = await prisma.fuelPrice.findUnique({
            where: { fuelType: payload.fuelType },
        });

        if (!fuelPrice) {
            throw new AppError(
                status.NOT_FOUND,
                "Fuel price not found for the given fuel type",
            );
        }
    }

    // If new images are coming and old images exist → delete old ones from Cloudinary
    if (payload.image && payload.image.length > 0 && isExist.image.length > 0) {
        await Promise.all(
            isExist.image.map((img) => deleteFileFromCloudinary(img)),
        );
    }

    const result = await prisma.vehicle.update({
        where: { id },
        data: payload,
        include: {
            vehicleType: {
                include: { category: true },
            },
            fuel: true,
        },
    });

    return result;
};

const deleteVehicle = async (id: string) => {
    const isExist = await prisma.vehicle.findUnique({
        where: { id },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Vehicle not found");
    }

    // Delete all images from Cloudinary
    if (isExist.image.length > 0) {
        await Promise.all(
            isExist.image.map((img) => deleteFileFromCloudinary(img)),
        );
    }

    await prisma.vehicle.delete({
        where: { id },
    });
};

export const vehicleService = {
    createVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
};