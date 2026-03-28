import { prisma } from "../lib/prisma";
import { Fuel, Unit } from "../../generated/prisma/enums";

const FUEL_UNIT_MAP: Record<Fuel, Unit> = {
    [Fuel.PETROL]: Unit.LITRE,
    [Fuel.OCTANE]: Unit.LITRE,
    [Fuel.DIESEL]: Unit.LITRE,
    [Fuel.HYBRID]: Unit.LITRE,
    [Fuel.CNG]: Unit.CUBIC_METRE,
    [Fuel.ELECTRIC]: Unit.KWH,
};

const FUEL_PRICE_MAP: Record<Fuel, number> = {
    [Fuel.PETROL]: 116,
    [Fuel.OCTANE]: 120,
    [Fuel.DIESEL]: 100,
    [Fuel.HYBRID]: 116,
    [Fuel.CNG]: 43,
    [Fuel.ELECTRIC]: 10,
};

export async function seedFuelPrice() {
    const fuels = Object.values(Fuel).filter(
        (v) => typeof v === "string",
    ) as Fuel[];

    for (const fuel of fuels) {
        try {
            await prisma.fuelPrice.create({
                data: {
                    fuelType: fuel,
                    pricePerUnit: FUEL_PRICE_MAP[fuel],
                    unit: FUEL_UNIT_MAP[fuel],
                },
            });

            console.log(`✅ ${fuel} seeded successfully`);
        } catch (error) {
            // ❌ do nothing if fails (as you requested)
        }
    }
}
