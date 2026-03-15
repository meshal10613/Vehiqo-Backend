import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { createVehicleCategorySchema, updateVehicleCategorySchema } from "./vehicelCategory.validation";
import { vehicleCategoryController } from "./vehicelCategory.controller";
import { multerUpload } from "../../config/multer";

const router = Router();

router.post(
    "/",
    multerUpload.single("image"),
    validateRequest(createVehicleCategorySchema),
    vehicleCategoryController.createVehicleCategory,
);

router.get("/", vehicleCategoryController.getAllVehicleCategory);

router.get("/:id", vehicleCategoryController.getVehicleCategoryById);

router.patch(
    "/:id",
    multerUpload.single("image"),
    validateRequest(updateVehicleCategorySchema),
    vehicleCategoryController.updateVehicleCategory,
);

router.delete("/:id", vehicleCategoryController.deleteVehicleCategory);

export const vehicleCategoryRoutes = router;
