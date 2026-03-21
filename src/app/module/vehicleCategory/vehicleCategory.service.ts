import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import {
    ICreateVehicleCategoryPayload,
    IUpdateVehicleCategoryPayload,
} from "./vehicleCategory.validation";
import { deleteFileFromCloudinary } from "../../config/cloudinary";
import { IQueryParams } from "../../interface/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Prisma, VehicleCategory } from "../../../generated/prisma/client";
import {
    vehicleCategoryFilterableFields,
    vehicleCategorySearchableFields,
} from "./vehicleCategory.constant";

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

const getAllVehicleCategory = async (query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        VehicleCategory,
        Prisma.VehicleCategoryWhereInput,
        Prisma.VehicleCategoryInclude
    >(prisma.vehicleCategory, query, {
        filterableFields: vehicleCategoryFilterableFields,
        searchableFields: vehicleCategorySearchableFields,
    });

    await queryBuilder
        .search()
        .filter()
        .include({ types: { include: { vehicles: true } } })
        .sort()
        .fields()
        .paginate();

    const result = await queryBuilder.execute();
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

    // If a new image is coming and old image exists → delete old one from Cloudinary
    if (payload?.image && isExist.image) {
        await deleteFileFromCloudinary(isExist.image);
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

    // Delete image from Cloudinary if exists
    if (isExist.image) {
        await deleteFileFromCloudinary(isExist.image);
    }

    await prisma.vehicleCategory.delete({
        where: { id },
    });
};

export const vehicleCategoryService = {
    createVehicleCategory,
    getAllVehicleCategory,
    getVehicleCategoryById,
    updateVehicleCategory,
    deleteVehicleCategory,
};
