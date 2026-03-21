import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { vehicleService } from "./vehicle.service";
import { IQueryParams } from "../../interface/query.interface";

const createVehicle = catchAsync(async (req, res) => {
    const payload = req.body;

    // Handle multiple image uploads
    if (req.files && Array.isArray(req.files)) {
        payload.image = (req.files as Express.Multer.File[]).map(
            (file) => file.path,
        );
    }

    const result = await vehicleService.createVehicle(payload);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Vehicle created successfully",
        data: result,
    });
});

const getAllVehicles = catchAsync(async (req, res) => {
    const query = req.query;
    const result = await vehicleService.getAllVehicles(query as IQueryParams);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicles retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getVehicleById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await vehicleService.getVehicleById(id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle retrieved successfully",
        data: result,
    });
});

const updateVehicle = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;

    // Handle multiple image uploads
    if (req.files && Array.isArray(req.files)) {
        payload.image = (req.files as Express.Multer.File[]).map(
            (file) => file.path,
        );
    }

    const result = await vehicleService.updateVehicle(id as string, payload);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle updated successfully",
        data: result,
    });
});

const deleteVehicle = catchAsync(async (req, res) => {
    const { id } = req.params;
    await vehicleService.deleteVehicle(id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle deleted successfully",
        data: null,
    });
});

export const vehicleController = {
    createVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
};