import { z } from "zod";

const booleanFromString = z.preprocess(
    (val) => {
        if (typeof val === "boolean") return val;
        if (val === "true") return true;
        if (val === "false") return false;
        return val; // let zod handle invalid values
    },
    z.boolean({ message: "must be a boolean" }),
);

export const createVehicleTypeSchema = z
    .object({
        name: z
            .string({
                message: "Vehicle type name must be a string",
            })
            .min(2, { message: "Name must be at least 2 characters" })
            .max(50, { message: "Name must not exceed 50 characters" })
            .trim()
            .transform((val) => val.replace(/\s+/g, " ")),

        isElectric: booleanFromString.optional(),
        requiresLicense: booleanFromString.optional(),

        categoryId: z
            .string({
                message: "Category ID must be a string",
            })
            .uuid({
                message: "Category ID must be a valid UUID",
            }),
    })
    .strict();

export const updateVehicleTypeSchema = z
    .object({
        name: z
            .string({
                message: "Vehicle type name must be a string",
            })
            .min(2, { message: "Name must be at least 2 characters" })
            .max(50, { message: "Name must not exceed 50 characters" })
            .trim()
            .transform((val) => val.replace(/\s+/g, " "))
            .optional(),

        isElectric: booleanFromString.optional(), // ✅ "true"/"false" → boolean
        requiresLicense: booleanFromString.optional(),

        categoryId: z
            .string({
                message: "Category ID must be a string",
            })
            .uuid({
                message: "Category ID must be a valid UUID",
            })
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0 || true, {
        message: "At least one field must be provided for update",
    })
    .strict();

/**
 * Payload Types
 */
export type ICreateVehicleTypePayload = z.infer<
    typeof createVehicleTypeSchema
> & { image?: string };

export type IUpdateVehicleTypePayload = z.infer<
    typeof updateVehicleTypeSchema
> & { image?: string };
