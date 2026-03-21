import { z } from "zod";
import {
    Fuel,
    Transmission,
    VehicleStatus,
} from "../../../generated/prisma/enums";

const coercedInt = (schema: z.ZodNumber) =>
    z.preprocess((val) => {
        if (typeof val === "number") return val;
        if (typeof val === "string" && val.trim() !== "")
            return parseInt(val, 10);
        return val;
    }, schema);

const coercedFloat = (schema: z.ZodNumber) =>
    z.preprocess((val) => {
        if (typeof val === "number") return val;
        if (typeof val === "string" && val.trim() !== "")
            return parseFloat(val);
        return val;
    }, schema);

export const createVehicleSchema = z
    .object({
        brand: z
            .string({ message: "Brand must be a string" })
            .min(2, { message: "Brand must be at least 2 characters" })
            .max(50, { message: "Brand must not exceed 50 characters" })
            .trim(),

        model: z
            .string({ message: "Model must be a string" })
            .min(1, { message: "Model must be at least 1 character" })
            .max(50, { message: "Model must not exceed 50 characters" })
            .trim(),

        year: coercedInt(
            z
                .number({ message: "Year must be a number" })
                .int({ message: "Year must be an integer" })
                .min(1950, { message: "Year must be 1950 or later" })
                .max(new Date().getFullYear() + 1, {
                    message: "Year cannot be in the future",
                }),
        ),

        plateNo: z
            .string({ message: "Plate number must be a string" })
            .min(3, { message: "Plate number must be at least 3 characters" })
            .max(20, { message: "Plate number must not exceed 20 characters" })
            .trim(),

        color: z
            .string({ message: "Color must be a string" })
            .min(2, { message: "Color must be at least 2 characters" })
            .max(30, { message: "Color must not exceed 30 characters" })
            .trim()
            .optional(),

        transmission: z.nativeEnum(Transmission, {
            message: "Invalid transmission type",
        }),

        fuelType: z.nativeEnum(Fuel, {
            message: "Invalid fuel type",
        }),

        pricePerDay: coercedFloat(
            z
                .number({ message: "Price per day must be a number" })
                .positive({ message: "Price per day must be greater than 0" })
                .max(100000, {
                    message: "Price per day seems unrealistically high",
                })
                .multipleOf(0.01, {
                    message: "Price can have at most 2 decimal places",
                }),
        ),

        seats: coercedInt(
            z
                .number({ message: "Seats must be a number" })
                .int({ message: "Seats must be an integer" })
                .min(1, { message: "Seats must be at least 1" })
                .max(100, { message: "Seats must not exceed 100" }),
        ).optional(),

        mileage: coercedFloat(
            z
                .number({ message: "Mileage must be a number" })
                .positive({ message: "Mileage must be greater than 0" }),
        ).optional(),

        range: coercedFloat(
            z
                .number({ message: "Range must be a number" })
                .positive({ message: "Range must be greater than 0" }),
        ).optional(),

        engineCC: coercedInt(
            z
                .number({ message: "Engine CC must be a number" })
                .int({ message: "Engine CC must be an integer" })
                .positive({ message: "Engine CC must be greater than 0" }),
        ).optional(),

        status: z
            .nativeEnum(VehicleStatus, {
                message: "Invalid vehicle status",
            })
            .optional(),

        description: z
            .string({ message: "Description must be a string" })
            .min(10, { message: "Description must be at least 10 characters" })
            .max(1000, {
                message: "Description must not exceed 1000 characters",
            })
            .trim()
            .optional(),

        features: z
            .array(
                z.string({ message: "Each feature must be a string" }).trim(),
                { message: "Features must be an array" },
            )
            .max(20, { message: "Features must not exceed 20 items" })
            .optional(),

        vehicleTypeId: z
            .string({ message: "Vehicle type ID must be a string" })
            .uuid({ message: "Vehicle type ID must be a valid UUID" }),
    })
    .strict();

export const updateVehicleSchema = z
    .object({
        brand: z
            .string({ message: "Brand must be a string" })
            .min(2, { message: "Brand must be at least 2 characters" })
            .max(50, { message: "Brand must not exceed 50 characters" })
            .trim()
            .optional(),

        model: z
            .string({ message: "Model must be a string" })
            .min(1, { message: "Model must be at least 1 character" })
            .max(50, { message: "Model must not exceed 50 characters" })
            .trim()
            .optional(),

        year: coercedInt(
            z
                .number({ message: "Year must be a number" })
                .int({ message: "Year must be an integer" })
                .min(1950, { message: "Year must be 1950 or later" })
                .max(new Date().getFullYear() + 1, {
                    message: "Year cannot be in the future",
                }),
        ).optional(),

        plateNo: z
            .string({ message: "Plate number must be a string" })
            .min(3, { message: "Plate number must be at least 3 characters" })
            .max(20, { message: "Plate number must not exceed 20 characters" })
            .trim()
            .optional(),

        color: z
            .string({ message: "Color must be a string" })
            .min(2, { message: "Color must be at least 2 characters" })
            .max(30, { message: "Color must not exceed 30 characters" })
            .trim()
            .optional(),

        transmission: z
            .nativeEnum(Transmission, {
                message: "Invalid transmission type",
            })
            .optional(),

        fuelType: z
            .nativeEnum(Fuel, {
                message: "Invalid fuel type",
            })
            .optional(),

        pricePerDay: coercedFloat(
            z
                .number({ message: "Price per day must be a number" })
                .positive({ message: "Price per day must be greater than 0" })
                .max(100000, {
                    message: "Price per day seems unrealistically high",
                })
                .multipleOf(0.01, {
                    message: "Price can have at most 2 decimal places",
                }),
        ).optional(),

        seats: coercedInt(
            z
                .number({ message: "Seats must be a number" })
                .int({ message: "Seats must be an integer" })
                .min(1, { message: "Seats must be at least 1" })
                .max(100, { message: "Seats must not exceed 100" }),
        ).optional(),

        mileage: coercedFloat(
            z
                .number({ message: "Mileage must be a number" })
                .positive({ message: "Mileage must be greater than 0" }),
        ).optional(),

        range: coercedFloat(
            z
                .number({ message: "Range must be a number" })
                .positive({ message: "Range must be greater than 0" }),
        ).optional(),

        engineCC: coercedInt(
            z
                .number({ message: "Engine CC must be a number" })
                .int({ message: "Engine CC must be an integer" })
                .positive({ message: "Engine CC must be greater than 0" }),
        ).optional(),

        status: z
            .nativeEnum(VehicleStatus, {
                message: "Invalid vehicle status",
            })
            .optional(),

        description: z
            .string({ message: "Description must be a string" })
            .min(10, { message: "Description must be at least 10 characters" })
            .max(1000, {
                message: "Description must not exceed 1000 characters",
            })
            .trim()
            .optional(),

        features: z
            .array(
                z.string({ message: "Each feature must be a string" }).trim(),
                { message: "Features must be an array" },
            )
            .max(20, { message: "Features must not exceed 20 items" })
            .optional(),

        vehicleTypeId: z
            .string({ message: "Vehicle type ID must be a string" })
            .uuid({ message: "Vehicle type ID must be a valid UUID" })
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0 || true, {
        message: "At least one field must be provided for update",
    });

/**
 * Payload Types
 */
export type ICreateVehiclePayload = z.infer<typeof createVehicleSchema> & {
    image?: string[];
};

export type IUpdateVehiclePayload = z.infer<typeof updateVehicleSchema> & {
    image?: string[];
};
