import { Router } from "express";
import { multerUpload } from "../../config/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { createVehicleSchema, updateVehicleSchema } from "./vehicle.validation";
import { vehicleController } from "./vehicle.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/",
    checkAuth(UserRole.ADMIN,),
    multerUpload.array("image", 10),      // 👈 multiple images, max 10
    validateRequest(createVehicleSchema),
    vehicleController.createVehicle,
);

router.get(
    "/",
    vehicleController.getAllVehicles,
);

router.get(
    "/:id",
    vehicleController.getVehicleById,
);

router.patch(
    "/:id",
    checkAuth(UserRole.ADMIN,),
    multerUpload.array("image", 10),      // 👈 multiple images, max 10
    validateRequest(updateVehicleSchema),
    vehicleController.updateVehicle,
);

router.delete(
    "/:id",
    checkAuth(UserRole.ADMIN,),
    vehicleController.deleteVehicle,
);

export const vehicleRoutes = router;