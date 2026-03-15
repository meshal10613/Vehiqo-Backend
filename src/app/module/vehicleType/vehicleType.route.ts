import { Router } from "express";
import { multerUpload } from "../../config/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { createVehicleTypeSchema } from "./vehicleType.validation";
import { vehicleTypeController } from "./vehicleType.controller";

const router = Router();

router.post(
	"/",
	multerUpload.single("image"),
	validateRequest(createVehicleTypeSchema),
	vehicleTypeController.createVehicleType,
);

export const vehicleTypeRoutes = router;