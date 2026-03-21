import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { userService } from "./user.service";
import { IQueryParams } from "../../interface/query.interface";

const getAllUsers = catchAsync(async (req, res, next) => {
    const query = req.query;

    const result = await userService.getAllUsers(query as IQueryParams);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

export const userController = { getAllUsers };
