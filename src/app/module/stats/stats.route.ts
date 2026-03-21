import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { statsController } from "./stats.controller";

const router = Router();

router.get("/", checkAuth(UserRole.ADMIN, UserRole.CUSTOMER), statsController.getStats);

export const statsRoutes = router;