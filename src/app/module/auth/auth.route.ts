import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { authValidation } from "./auth.validation";

const router = Router();

router.post(
    "/register",
    validateRequest(authValidation.registerUserSchema),
    authController.registerUser,
);
router.post(
    "/login",
    validateRequest(authValidation.loginUserSchema),
    authController.loginUser,
);

export const authRoutes = router;
