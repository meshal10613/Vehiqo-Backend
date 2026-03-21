import { z } from "zod";

export const createVehicleCategorySchema = z
    .object({
        name: z
            .string({
                message: "Category name must be a string",
            })
            .min(2, { message: "Name must be at least 2 characters" })
            .max(50, { message: "Name must not exceed 50 characters" })
            .trim()
            .transform((val) => val.replace(/\s+/g, " ")), // collapse multiple spaces

        description: z
            .string({ message: "Description must be a string" })
            .min(10, { message: "Description must be at least 10 characters" })
            .max(500, { message: "Description must not exceed 500 characters" })
            .trim()
            .optional(),
    })
    .strict();

export const updateVehicleCategorySchema = z
    .object({
        name: z
            .string({ message: "Category name must be a string" })
            .min(2, { message: "Name must be at least 2 characters" })
            .max(50, { message: "Name must not exceed 50 characters" })
            .trim()
            .transform((val) => val.replace(/\s+/g, " "))
            .optional(),

        description: z
            .string({ message: "Description must be a string" })
            .min(10, { message: "Description must be at least 10 characters" })
            .max(500, { message: "Description must not exceed 500 characters" })
            .trim()
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0 || true, {
        message: "At least one field must be provided for update",
    })
    .strict();

export type ICreateVehicleCategoryPayload = z.infer<
    typeof createVehicleCategorySchema
> & { image?: string };

export type IUpdateVehicleCategoryPayload = z.infer<
    typeof updateVehicleCategorySchema
> & { image?: string };
