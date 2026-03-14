import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { auth } from "../../lib/auth";
import { ILoginUserPayload, IRegisterUserPayload } from "./auth.interface";
import { prisma } from "../../lib/prisma";

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

    return data;
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

    return data;
};

export const authService = { registerUser, loginUser };
