import { betterAuth } from "better-auth";
import { envVars } from "../config/env";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { UserRole } from "../../generated/prisma/enums";
import { bearer, emailOTP } from "better-auth/plugins";
import chalk from "chalk";
import { sendEmail } from "../utils/email";

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
    plugins: [
        bearer(),
        emailOTP({
            overrideDefaultEmailVerification: true,
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "email-verification") {
                    const user = await prisma.user.findUnique({
                        where: {
                            email,
                        },
                    });

                    if (!user) {
                        console.error(
                            `User with email ${email} not found. Cannot send verification OTP.`,
                        );
                        return;
                    }

                    if (user && user.role === UserRole.ADMIN) {
                        console.log(
                            chalk.green(
                                `User with email ${email} is a admin. Skipping sending verification OTP.`,
                            ),
                        );
                        return;
                    }

                    if (user && !user.emailVerified) {
                        sendEmail({
                            to: email,
                            subject: "Verify your email",
                            templateName: "otp",
                            templateData: {
                                name: user.name,
                                otp,
                            },
                        });
                    }
                } else if (type === "forget-password") {
                    const user = await prisma.user.findUnique({
                        where: {
                            email,
                        },
                    });

                    if (user) {
                        sendEmail({
                            to: email,
                            subject: "Password Reset OTP",
                            templateName: "otp",
                            templateData: {
                                name: user.name,
                                otp,
                            },
                        });
                    }
                }
            },
            expiresIn: 2 * 60, // 2 minutes in seconds
            otpLength: 6,
        }),
    ],
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
        },
    },
});
