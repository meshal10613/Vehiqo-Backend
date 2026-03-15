import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateVehicleTypePayload } from "./vehicleType.validation";

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

export const vehicleTypeService = {
    createVehicleType,
};
