import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { authValidation } from "./auth.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

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
router.get(
    "/me",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    authController.getMe,
);
router.post("/verify-email", authController.verifyEmail);

router.patch(
    "/update-profile",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    validateRequest(authValidation.updateUserSchema),
    authController.updateUser,
);

router.post(
    "/logout",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    authController.logoutUser,
);

export const authRoutes = router;
