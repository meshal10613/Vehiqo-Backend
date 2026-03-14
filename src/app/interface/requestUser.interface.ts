import { UserRole } from "../../generated/prisma/enums";

export interface IRequestUser {
    userId: string;
    role: UserRole;
    email: string;
}
