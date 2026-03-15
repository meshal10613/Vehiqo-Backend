import { UserRole } from "../../../generated/prisma/enums";

export interface IRegisterUserPayload {
	name: string
    email: string;
    password: string;
}

export interface ILoginUserPayload {
    email: string;
    password: string;
}

export interface IUpdateUserPayload {
    name?: string;
    image?: string;
    mobileNumber?: string;
    licenseNumber?: string;
    nidNumber?: string;
}

export interface IChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

export interface IUpdateRolePayload {
    userId: string;
    role: UserRole;
}