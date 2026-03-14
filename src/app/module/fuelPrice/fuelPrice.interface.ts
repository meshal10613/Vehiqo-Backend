import { Fuel, Unit } from "../../../generated/prisma/enums";

export interface ICreateFuelPricePayload {
    fuelType: Fuel;
    pricePerUnit: number;
    unit: Unit;
}

export interface IUpdateFuelPricePayload {
    pricePerUnit: number;
}
