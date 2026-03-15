import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { vehicleCategoryService } from "./vehicelCategory.service";

const createVehicleCategory = catchAsync(async (req, res, next) => {
    const payload = req.body;
    // Only update image if a new file was uploaded
    if (req.file?.path) {
        payload.image = req.file.path; // 👈 Cloudinary URL
    }
    const result = await vehicleCategoryService.createVehicleCategory(payload);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Vehicle category created successfully",
        data: result,
    });
});

const getAllVehicleCategory = catchAsync(async (req, res) => {
    const result = await vehicleCategoryService.getAllVehicleCategory();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle categories retrieved successfully",
        data: result,
    });
});

const getVehicleCategoryById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const result = await vehicleCategoryService.getVehicleCategoryById(
        id as string,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle category retrieved successfully",
        data: result,
    });
});

const updateVehicleCategory = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;

    // Only update image if a new file was uploaded
    if (req.file?.path) {
        payload.image = req.file.path; // 👈 Cloudinary URL
    }

    const result = await vehicleCategoryService.updateVehicleCategory(
        id as string,
        payload,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle category updated successfully",
        data: result,
    });
});

const deleteVehicleCategory = catchAsync(async (req, res) => {
    const { id } = req.params;

    await vehicleCategoryService.deleteVehicleCategory(
        id as string,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle category deleted successfully",
    });
});

export const vehicleCategoryController = {
    createVehicleCategory,
    getAllVehicleCategory,
    getVehicleCategoryById,
    updateVehicleCategory,
    deleteVehicleCategory,
};
