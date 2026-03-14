import { Router } from "express";
import { authRoutes } from "../module/auth/auth.route";

const router = Router();

router.use("/auth", authRoutes);

export const IndexRoutes = router;