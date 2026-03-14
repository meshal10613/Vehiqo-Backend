import { Router } from "express";
import { authRoutes } from "../module/auth/auth.route";
import { fuelPriceRoutes } from "../module/fuelPrice/fuelPrice.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/fuel-price", fuelPriceRoutes);

export const IndexRoutes = router;