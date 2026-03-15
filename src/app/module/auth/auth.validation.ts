import { z } from "zod";

const registerUserSchema = z
    .object({
        name: z
            .string()
            .min(2, "Name must be at least 2 characters")
            .max(50, "Name is too long")
            .trim(),
        email: z.string().email("Invalid email address").trim(),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .max(100, "Password is too long"),
    })
    .strict();

const loginUserSchema = z
    .object({
        email: z.string().email("Invalid email address").trim(),
        password: z.string().min(1, "Password is required"),
    })
    .strict();

export const updateUserSchema = z
    .object({
        name: z
            .string({ message: "Name must be a string" })
            .min(2, { message: "Name must be at least 2 characters" })
            .max(100, { message: "Name must not exceed 100 characters" })
            .trim()
            .transform((val) => val.replace(/\s+/g, " "))
            .optional(),

        mobileNumber: z
            .string({ message: "Mobile number must be a string" })
            .regex(/^(?:\+8801|01)[3-9]\d{8}$/, {
                message: "Mobile number must be a valid Bangladeshi number",
            })
            .optional(),

        licenseNumber: z
            .string({ message: "License number must be a string" })
            .min(5, { message: "License number must be at least 5 characters" })
            .max(50, {
                message: "License number must not exceed 50 characters",
            })
            .trim()
            .optional(),

        nidNumber: z
            .string({ message: "NID number must be a string" })
            .regex(/^\d{10}(\d{3})?$/, {
                message: "NID number must be 10 or 13 digits",
            })
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0 || true, {
        message: "At least one field must be provided for update",
    });

export const authValidation = { registerUserSchema, loginUserSchema, updateUserSchema };
