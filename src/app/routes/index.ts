import { Router } from "express";
import { authRoutes } from "../module/auth/auth.route";
import { fuelPriceRoutes } from "../module/fuelPrice/fuelPrice.route";
import { vehicleCategoryRoutes } from "../module/vehicleCategory/vehicelCategory.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/fuel-price", fuelPriceRoutes);
router.use("/vehicle-category", vehicleCategoryRoutes);

export const IndexRoutes = router;