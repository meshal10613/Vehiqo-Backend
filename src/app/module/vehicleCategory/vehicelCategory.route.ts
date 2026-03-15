import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import {
    createVehicleCategorySchema,
    updateVehicleCategorySchema,
} from "./vehicelCategory.validation";
import { vehicleCategoryController } from "./vehicelCategory.controller";
import { multerUpload } from "../../config/multer";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/",
    checkAuth(UserRole.ADMIN),
    multerUpload.single("image"),
    validateRequest(createVehicleCategorySchema),
    vehicleCategoryController.createVehicleCategory,
);

router.get("/", vehicleCategoryController.getAllVehicleCategory);

router.get("/:id", vehicleCategoryController.getVehicleCategoryById);

router.patch(
    "/:id",
    checkAuth(UserRole.ADMIN),
    multerUpload.single("image"),
    validateRequest(updateVehicleCategorySchema),
    vehicleCategoryController.updateVehicleCategory,
);

router.delete(
    "/:id",
    checkAuth(UserRole.ADMIN),
    vehicleCategoryController.deleteVehicleCategory,
);

export const vehicleCategoryRoutes = router;
