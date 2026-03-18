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
router.post("/refresh-token", authController.getNewToken);
router.post(
    "/change-password",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    authController.changePassword,
);

router.patch(
    "/update-profile",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    validateRequest(authValidation.updateUserSchema),
    authController.updateUser,
);

router.patch("/update-role", checkAuth(UserRole.ADMIN), authController.updateRole);

router.post("/verify-email", authController.verifyEmail);
router.post("/forget-password", authController.forgetPassword);
router.post("/reset-password", authController.resetPassword);

router.post(
    "/logout",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    authController.logoutUser,
);

export const authRoutes = router;
