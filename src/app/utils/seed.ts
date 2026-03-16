import { UserRole } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const seedAdmin = async () => {
    try {
        const isAdminExist = await prisma.user.findFirst({
            where: {
                role: UserRole.ADMIN,
            },
        });

        if (isAdminExist) {
            console.log(
                "Admin already exists. Skipping seeding admin.",
            );
            return;
        }

        const superAdminUser = await auth.api.signUpEmail({
            body: {
                email: envVars.ADMIN.EMAIL,
                password: envVars.ADMIN.PASSWORD,
                name: "Admin",
                role: UserRole.ADMIN,
                rememberMe: false,
            },
        });

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: {
                    id: superAdminUser.user.id,
                },
                data: {
                    emailVerified: true,
                },
            });
        });

        const admin = await prisma.user.findUnique({
            where: {
                email: envVars.ADMIN.EMAIL,
            },
        });

        console.log("Admin Created ", admin);
    } catch (error) {
        console.error("Error seeding admin: ", error);
        await prisma.user.delete({
            where: {
                email: envVars.ADMIN.EMAIL,
            },
        });
    }
};
