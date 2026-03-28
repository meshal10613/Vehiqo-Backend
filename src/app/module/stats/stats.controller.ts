import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { IRequestUser } from "../../interface/requestUser.interface";
import { statsService } from "./stats.service";

const getStats = catchAsync(async (req, res) => {
    const user = req.user;
    const result = await statsService.getStats(user as IRequestUser);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Stats retrieved successfully",
        data: result,
    });
});

const getPublicStats = catchAsync(async (req, res) => {
    const result = await statsService.getPublicStats();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Stats retrieved successfully",
        data: result,
    });
});

export const statsController = { getStats, getPublicStats };
