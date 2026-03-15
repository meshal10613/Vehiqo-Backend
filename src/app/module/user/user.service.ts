import { prisma } from "../../lib/prisma";

const getAllUsers = async () => {
    const result = await prisma.user.findMany({
        where: {
            isDeleted: false,
        },
    });
    return result;
};

export const userService = {
    getAllUsers,
};
