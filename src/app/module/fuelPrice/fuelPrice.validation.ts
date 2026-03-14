import z from "zod";
import { Fuel, Unit } from "../../../generated/prisma/enums";

const FUEL_UNIT_MAP: Record<Fuel, Unit> = {
    [Fuel.PETROL]: Unit.LITRE,
    [Fuel.DIESEL]: Unit.LITRE,
    [Fuel.HYBRID]: Unit.LITRE,
    [Fuel.CNG]: Unit.CUBIC_METRE,
    [Fuel.ELECTRIC]: Unit.KWH,
    [Fuel.HUMAN_POWERED]: Unit.NONE,
};

export const createFuelPriceSchema = z
    .object({
        fuelType: z.nativeEnum(Fuel),
        pricePerUnit: z
            .number()
            .positive({ message: "Price must be greater than 0" })
            .max(10000, { message: "Price seems unrealistically high" })
            .multipleOf(0.01, {
                message: "Price can have at most 2 decimal places",
            }),
        unit: z.nativeEnum(Unit),
    })
    .refine((data) => FUEL_UNIT_MAP[data.fuelType] === data.unit, {
        message: "Fuel type and unit do not match",
        path: ["unit"],
    })
    .strict();

export const updateFuelPriceSchema = z
    .object({
        pricePerUnit: z
            .number()
            .positive({ message: "Price must be greater than 0" })
            .max(10000, { message: "Price seems unrealistically high" })
            .multipleOf(0.01, {
                message: "Price can have at most 2 decimal places",
            }),
    })
    .strict();
