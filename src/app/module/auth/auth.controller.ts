import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { authService } from "./auth.service";
import { tokenUtils } from "../../utils/token";
import { CookieUtils } from "../../utils/cookie";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";

const registerUser = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body;
        const result = await authService.registerUser(payload);
        const { accessToken, refreshToken, token, ...rest } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
        tokenUtils.setBetterAuthSessionCookie(res, token as string);

        sendResponse(res, {
            httpStatusCode: status.CREATED,
            success: true,
            message: "User sign up successfully",
            data: {
                token,
                accessToken,
                refreshToken,
                ...rest,
            },
        });
    },
);

const loginUser = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body;
        const result = await authService.loginUser(payload);
        const { accessToken, refreshToken, token, ...rest } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
        tokenUtils.setBetterAuthSessionCookie(res, token);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User sign in successfully",
            data: {
                token,
                accessToken,
                refreshToken,
                ...rest,
            },
        });
    },
);

const getMe = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        const result = await authService.getMe(user);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User fetched successfully",
            data: result,
        });
    },
);

const getNewToken = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const refreshToken = req.cookies.refreshToken;
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];
        if (!refreshToken) {
            throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
        }
        const result = await authService.getNewToken(
            refreshToken,
            betterAuthSessionToken,
        );

        const {
            accessToken,
            refreshToken: newRefreshToken,
            sessionToken,
        } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, newRefreshToken);
        tokenUtils.setBetterAuthSessionCookie(res, sessionToken);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "New tokens generated successfully",
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                sessionToken,
            },
        });
    },
);

const changePassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body;
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];
        const result = await authService.changePassword(
            payload,
            betterAuthSessionToken,
        );

        const { accessToken, refreshToken, token } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken);
        tokenUtils.setRefreshTokenCookie(res, refreshToken);
        tokenUtils.setBetterAuthSessionCookie(res, token as string);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password changed successfully",
            data: result,
        });
    },
);

const updateUser = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body;
        const user = req.user;

        // Only update image if a new file was uploaded
        if (req.file?.path) {
            payload.image = req.file.path; // 👈 Cloudinary URL
        }

        const result = await authService.updateUser(payload, user);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User updated successfully",
            data: result,
        });
    },
);

const updateRole = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body;
        const user = req.user;

        const result = await authService.updateRole(payload, user);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User role updated successfully",
            data: result,
        });
    },
);

const verifyEmail = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp } = req.body;
        await authService.verifyEmail(email, otp);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Email verified successfully",
        });
    },
);

const forgetPassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { email } = req.body;
        await authService.forgetPassword(email);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password reset OTP sent to email successfully",
        });
    },
);

const resetPassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp, newPassword } = req.body;
        await authService.resetPassword(email, otp, newPassword);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Password reset successfully",
        });
    },
);

const deleteUser = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const user = req.user;
        await authService.deleteUser(id as string, user as IRequestUser);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User deleted successfully",
        });
    },
);

const logoutUser = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const betterAuthSessionToken = req.cookies["better-auth.session_token"];
        const result = await authService.logoutUser(betterAuthSessionToken);
        CookieUtils.clearCookie(res, "accessToken", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });
        CookieUtils.clearCookie(res, "refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });
        CookieUtils.clearCookie(res, "better-auth.session_token", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "User logged out successfully",
            data: result,
        });
    },
);

export const authController = {
    registerUser,
    loginUser,
    getMe,
    getNewToken,
    changePassword,
    updateUser,
    updateRole,
    verifyEmail,
    forgetPassword,
    resetPassword,
    deleteUser,
    logoutUser,
};
