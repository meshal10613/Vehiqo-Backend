import { Router } from "express";
import { multerUpload } from "../../config/multer";
import { validateRequest } from "../../middleware/validateRequest";
import {
    createVehicleTypeSchema,
    updateVehicleTypeSchema,
} from "./vehicleType.validation";
import { vehicleTypeController } from "./vehicleType.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/",
    checkAuth(UserRole.ADMIN),
    multerUpload.single("image"),
    validateRequest(createVehicleTypeSchema),
    vehicleTypeController.createVehicleType,
);

router.get("/", vehicleTypeController.getAllVehicleTypes);

router.get("/:id", vehicleTypeController.getVehicleTypeById);

router.patch(
    "/:id",
    checkAuth(UserRole.ADMIN),
    multerUpload.single("image"),
    validateRequest(updateVehicleTypeSchema),
    vehicleTypeController.updateVehicleType,
);

router.delete(
    "/:id",
    checkAuth(UserRole.ADMIN),
    vehicleTypeController.deleteVehicleType,
);

export const vehicleTypeRoutes = router;
