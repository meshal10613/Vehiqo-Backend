import { Router } from "express";
import { fuelPriceController } from "./fuelPrice.controller";
import { validateRequest } from "../../middleware/validateRequest";
import {
    createFuelPriceSchema,
    updateFuelPriceSchema,
} from "./fuelPrice.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/",
    checkAuth(UserRole.ADMIN),
    validateRequest(createFuelPriceSchema),
    fuelPriceController.createFuelPrice,
);

router.patch(
    "/:id",
    validateRequest(updateFuelPriceSchema),
    fuelPriceController.updateFuelPrice,
);
router.get("/", fuelPriceController.getAllFuelPrice);

export const fuelPriceRoutes = router;
