import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { fuelPriceService } from "./fuelPrice.service";
import { IQueryParams } from "../../interface/query.interface";

const createFuelPrice = catchAsync(async (req, res, next) => {
    const payload = req.body;
    const result = await fuelPriceService.createFuelPrice(payload);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Fuel price created successfully",
        data: result,
    });
});

const updateFuelPrice = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const payload = req.body;
    const result = await fuelPriceService.updateFuelPrice(
        id as string,
        payload,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Fuel price updated successfully",
        data: result,
    });
});

const getAllFuelPrice = catchAsync(async (req, res, next) => {
    const query = req.query;
    const result = await fuelPriceService.getAllFuelPrice(query as IQueryParams);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Fuel price fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

export const fuelPriceController = {
    createFuelPrice,
    updateFuelPrice,
    getAllFuelPrice,
};
