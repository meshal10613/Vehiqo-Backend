import { Router } from "express";
import { authRoutes } from "../module/auth/auth.route";
import { fuelPriceRoutes } from "../module/fuelPrice/fuelPrice.route";
import { vehicleCategoryRoutes } from "../module/vehicleCategory/vehicelCategory.route";
import { vehicleTypeRoutes } from "../module/vehicleType/vehicleType.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/fuel-price", fuelPriceRoutes);
router.use("/vehicle-category", vehicleCategoryRoutes);
router.use("/vehicle-type", vehicleTypeRoutes);

export const IndexRoutes = router;