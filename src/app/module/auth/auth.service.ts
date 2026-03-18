import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { auth } from "../../lib/auth";
import {
    IChangePasswordPayload,
    ILoginUserPayload,
    IRegisterUserPayload,
    IUpdateRolePayload,
    IUpdateUserPayload,
} from "./auth.interface";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interface/requestUser.interface";
import { deleteFileFromCloudinary } from "../../config/cloudinary";
import { JwtPayload } from "jsonwebtoken";
import { jwtUtils } from "../../utils/jwt";
import { envVars } from "../../config/env";

const registerUser = async (payload: IRegisterUserPayload) => {
    const { name, email, password } = payload;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new AppError(status.BAD_REQUEST, "User already exists");
    }

    const data = await auth.api.signUpEmail({
        body: {
            name,
            email,
            password,
        },
    });

    if (!data.user) {
        throw new AppError(status.BAD_REQUEST, "Failed to register user");
    }

    const accessToken = tokenUtils.getAccessToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        emailVerified: data.user.emailVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        emailVerified: data.user.emailVerified,
    });

    return {
        ...data,
        accessToken,
        refreshToken,
    };
};

const loginUser = async (payload: ILoginUserPayload) => {
    const { email, password } = payload;

    const data = await auth.api.signInEmail({
        body: {
            email,
            password,
        },
    });

    const accessToken = tokenUtils.getAccessToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        emailVerified: data.user.emailVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        emailVerified: data.user.emailVerified,
    });

    return {
        ...data,
        accessToken,
        refreshToken,
    };
};

const getMe = async (user: IRequestUser) => {
    const isUserExist = await prisma.user.findUnique({
        where: {
            id: user.userId,
        },
    });

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    return isUserExist;
};

const getNewToken = async (refreshToken: string, sessionToken: string) => {
    const isSessionTokenExists = await prisma.session.findUnique({
        where: {
            token: sessionToken,
        },
        include: {
            user: true,
        },
    });

    if (!isSessionTokenExists) {
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const verifiedRefreshToken = jwtUtils.verifyToken(
        refreshToken,
        envVars.REFRESH_TOKEN_SECRET,
    );

    if (!verifiedRefreshToken.success && verifiedRefreshToken.error) {
        throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    const data = verifiedRefreshToken.data as JwtPayload;

    const newAccessToken = tokenUtils.getAccessToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified,
    });

    const newRefreshToken = tokenUtils.getRefreshToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDeleted: data.isDeleted,
        emailVerified: data.emailVerified,
    });

    const { token } = await prisma.session.update({
        where: {
            token: sessionToken,
        },
        data: {
            token: sessionToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 60 * 24 * 1000),
            updatedAt: new Date(),
        },
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionToken: token,
    };
};

const changePassword = async (
    payload: IChangePasswordPayload,
    sessionToken: string,
) => {
    const session = await auth.api.getSession({
        headers: new Headers({
            Authorization: `Bearer ${sessionToken}`,
        }),
    });

    if (!session) {
        throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }

    const isGoogleAccount = await prisma.account.count({
        where: {
            userId: session.user.id,
            providerId: "google",
        },
    });

    if (isGoogleAccount > 0) {
        throw new AppError(
            status.BAD_REQUEST,
            "Password cannot be changed for Google accounts.",
        );
    }

    const { currentPassword, newPassword } = payload;

    const result = await auth.api.changePassword({
        body: {
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
        },
        headers: new Headers({
            Authorization: `Bearer ${sessionToken}`,
        }),
    });

    const accessToken = tokenUtils.getAccessToken({
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
    });

    return {
        ...result,
        accessToken,
        refreshToken,
    };
};

const updateUser = async (payload: IUpdateUserPayload, user: IRequestUser) => {
    const isExist = await prisma.user.findUnique({
        where: { id: user.userId },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    // Only the owner can update their profile
    if (isExist.email !== user.email || isExist.role !== user.role) {
        throw new AppError(
            status.FORBIDDEN,
            "You are not allowed to update this user",
        );
    }

    // If new image is coming and old image exists → delete old from Cloudinary
    if (payload.image && isExist.image) {
        await deleteFileFromCloudinary(isExist.image);
    }

    const result = await prisma.user.update({
        where: { id: user.userId },
        data: payload,
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            mobileNumber: true,
            licenseNumber: true,
            nidNumber: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return result;
};

const updateRole = async (payload: IUpdateRolePayload, user: IRequestUser) => {
    // Prevent admin from changing their own role
    if (payload.userId === user.userId) {
        throw new AppError(status.FORBIDDEN, "You cannot change your own role");
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: payload.userId },
    });

    if (!targetUser) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const result = await prisma.user.update({
        where: { id: payload.userId },
        data: { role: payload.role },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return result;
};

const verifyEmail = async (email: string, otp: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found.");
    }

    // Check if user has a credentials/password account
    const passwordAccount = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: "credential", // adjust if your auth uses another name
        },
    });

    if (!passwordAccount) {
        throw new AppError(
            status.BAD_REQUEST,
            "Email verification is not allowed for social login accounts.",
        );
    }

    const result = await auth.api.verifyEmailOTP({
        body: {
            email,
            otp,
        },
    });

    if (!result?.user) {
        throw new AppError(status.BAD_REQUEST, "Invalid OTP.");
    }

    if (result.status && !result.user.emailVerified) {
        await prisma.user.update({
            where: {
                email,
            },
            data: {
                emailVerified: true,
            },
        });
    }
};

const forgetPassword = async (email: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            emailVerified: true,
        },
    });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const passwordAccount = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: "credential",
        },
        select: { id: true },
    });

    if (!passwordAccount) {
        throw new AppError(
            status.BAD_REQUEST,
            "Password reset is not available for social login accounts.",
        );
    }

    if (!user.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    await auth.api.requestPasswordResetEmailOTP({
        body: { email },
    });
};

const resetPassword = async (
    email: string,
    otp: string,
    newPassword: string,
) => {
    const isUserExist = await prisma.user.findUnique({
        where: {
            email,
        },
    });

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!isUserExist.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
    }

    const passwordAccount = await prisma.account.findFirst({
        where: {
            userId: isUserExist.id,
            providerId: "credential",
        },
        select: { id: true },
    });

    if (!passwordAccount) {
        throw new AppError(
            status.BAD_REQUEST,
            "Password reset is not available for social login accounts.",
        );
    }

    await auth.api.resetPasswordEmailOTP({
        body: {
            email,
            otp,
            password: newPassword,
        },
    });

    await prisma.session.deleteMany({
        where: {
            userId: isUserExist.id,
        },
    });
};

const logoutUser = async (sessionToken: string) => {
    const result = await auth.api.signOut({
        headers: new Headers({
            Authorization: `Bearer ${sessionToken}`,
        }),
    });

    return result;
};

export const authService = {
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
    logoutUser,
};
