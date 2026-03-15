import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { userController } from "./user.controller";

const router = Router();

router.get("/", checkAuth(UserRole.ADMIN), userController.getAllUsers);

export const userRoutes = router;