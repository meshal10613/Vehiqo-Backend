import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { auth } from "../../lib/auth";
import { ILoginUserPayload, IRegisterUserPayload } from "./auth.interface";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interface/requestUser.interface";

const registerUser = async (payload: IRegisterUserPayload) => {
    const { name, email, password } = payload;

    const existingUser = await prisma.user.findUnique({
        where: { email, isDeleted: false },
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
        isDeleted: data.user.isDeleted,
        emailVerified: data.user.emailVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        isDeleted: data.user.isDeleted,
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

    if (data.user.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User is deleted");
    }

    const accessToken = tokenUtils.getAccessToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        isDeleted: data.user.isDeleted,
        emailVerified: data.user.emailVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        isDeleted: data.user.isDeleted,
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

export const authService = { registerUser, loginUser, getMe };
