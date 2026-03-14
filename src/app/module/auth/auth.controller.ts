import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { authService } from "./auth.service";

const registerUser = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body;
        const result = await authService.registerUser(payload);
        // const { accessToken, refreshToken, token, ...rest } = result;
        const data = result;
		
        // tokenUtils.setAccessTokenCookie(res, accessToken);
        // tokenUtils.setRefreshTokenCookie(res, refreshToken);
        // tokenUtils.setBetterAuthSessionCookie(res, token as string);

        sendResponse(res, {
            httpStatusCode: status.CREATED,
            success: true,
            message: "User registered successfully",
            // data: {
            //     token,
            //     accessToken,
            //     refreshToken,
            //     ...rest,
            // },
			data
        });
    },
);

const loginUser = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
	const payload = req.body;
	const result = await authService.loginUser(payload);
	const data = result;
	sendResponse(res, {
		httpStatusCode: status.OK,
		success: true,
		message: "User logged in successfully",
		data,
	});
})

export const authController = {
	registerUser,
	loginUser,
};