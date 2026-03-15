import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { vehicleTypeService } from "./vehicleType.service";

const createVehicleType = catchAsync(async (req, res, next) => {
    const payload = req.body;
    // Only update image if a new file was uploaded
    if (req.file?.path) {
        payload.image = req.file.path; // 👈 Cloudinary URL
    }
    const result = await vehicleTypeService.createVehicleType(payload);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Vehicle category created successfully",
        data: result,
    });
});

const getAllVehicleTypes = catchAsync(async (req, res) => {
    const result = await vehicleTypeService.getAllVehicleTypes();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle types retrieved successfully",
        data: result,
    });
});

const getVehicleTypeById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await vehicleTypeService.getVehicleTypeById(id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle type retrieved successfully",
        data: result,
    });
});

const updateVehicleType = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;

    if (req.file?.path) {
        payload.image = req.file.path;
    }

    const result = await vehicleTypeService.updateVehicleType(id as string, payload);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle type updated successfully",
        data: result,
    });
});

const deleteVehicleType = catchAsync(async (req, res) => {
    const { id } = req.params;
    await vehicleTypeService.deleteVehicleType(id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle type deleted successfully",
        data: null,
    });
});

export const vehicleTypeController = {
    createVehicleType,
    getAllVehicleTypes,
    getVehicleTypeById,
    updateVehicleType,
    deleteVehicleType,
};
