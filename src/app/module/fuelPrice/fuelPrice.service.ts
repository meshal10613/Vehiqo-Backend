import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import {
    ICreateFuelPricePayload,
    IUpdateFuelPricePayload,
} from "./fuelPrice.interface";
import { IQueryParams } from "../../interface/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { FuelPrice, Prisma } from "../../../generated/prisma/client";
import { fuelPriceFilterableFields } from "./fuelPrice.constant";

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

const getAllFuelPrice = async (query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        FuelPrice,
        Prisma.FuelPriceWhereInput,
        Prisma.FuelPriceInclude
    >(prisma.fuelPrice, query, {
        filterableFields: fuelPriceFilterableFields,
    });

    await queryBuilder
        .search()
        .filter()
        .include({
            vehicle: true,
        })
        .sort()
        .fields()

    // override orderBy if sorting by vehicle count
    if (query.sortBy === "vehicleCount") {
        const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
        queryBuilder.getQuery().orderBy = {
            vehicle: { _count: sortOrder },
        };
    }

    const result = await queryBuilder.execute();
    return result;
};

export const fuelPriceService = {
    createFuelPrice,
    updateFuelPrice,
    getAllFuelPrice,
};
