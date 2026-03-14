import { betterAuth } from "better-auth";
import { envVars } from "../config/env";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { UserRole } from "../../generated/prisma/enums";

export const auth = betterAuth({
    baseURL: envVars.BETTER_AUTH_URL,
    secret: envVars.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    session: {
        expiresIn: 60 * 60 * 60 * 24, // 1 day in seconds
        updateAge: 60 * 60 * 60 * 24, // 1 day in seconds
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 60 * 24, // 1 day in seconds
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
    },
    user: {
        additionalFields: {
			mobileNumber: {
				type: "string",
				required: false,
				defaultValue: null,
			},
            role: {
                type: "string",
                required: true,
                defaultValue: UserRole.CUSTOMER,
            },
            licenseNumber: {
				type: "string",
				required: false,
				defaultValue: null,
				unique: true,
			},
			nidNumber: {
				type: "string",
				required: false,
				defaultValue: null,
				unique: true,
			},
            isDeleted: {
                type: "boolean",
                required: false,
                defaultValue: false,
            },
            deletedAt: {
                type: "date",
                required: false,
                defaultValue: null,
            },
        },
    },
});
