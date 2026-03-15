import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { createVehicleCategorySchema, updateVehicleCategorySchema } from "./vehicelCategory.validation";
import { vehicleCategoryController } from "./vehicelCategory.controller";

const router = Router();

router.post(
    "/",
    validateRequest(createVehicleCategorySchema),
    vehicleCategoryController.createVehicleCategory,
);

router.get("/", vehicleCategoryController.getAllVehicleCategory);

router.get("/:id", vehicleCategoryController.getVehicleCategoryById);

router.patch(
    "/:id",
    validateRequest(updateVehicleCategorySchema),
    vehicleCategoryController.updateVehicleCategory,
);

router.delete("/:id", vehicleCategoryController.deleteVehicleCategory);

export const vehicleCategoryRoutes = router;
