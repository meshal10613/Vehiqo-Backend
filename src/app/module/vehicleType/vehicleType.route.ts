import { Router } from "express";
import { multerUpload } from "../../config/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { createVehicleTypeSchema, updateVehicleTypeSchema } from "./vehicleType.validation";
import { vehicleTypeController } from "./vehicleType.controller";

const router = Router();

router.post(
	"/",
	multerUpload.single("image"),
	validateRequest(createVehicleTypeSchema),
	vehicleTypeController.createVehicleType,
);

router.get(
    "/",
    vehicleTypeController.getAllVehicleTypes,
);

router.get(
    "/:id",
    vehicleTypeController.getVehicleTypeById,
);

router.patch(
    "/:id",
    multerUpload.single("image"),
    validateRequest(updateVehicleTypeSchema),
    vehicleTypeController.updateVehicleType,
);

router.delete(
    "/:id",
    vehicleTypeController.deleteVehicleType,
);

export const vehicleTypeRoutes = router;