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

export const vehicleTypeController = {
    createVehicleType,
};
