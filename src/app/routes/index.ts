import { Router } from "express";
import { authRoutes } from "../module/auth/auth.route";
import { fuelPriceRoutes } from "../module/fuelPrice/fuelPrice.route";
import { vehicleCategoryRoutes } from "../module/vehicleCategory/vehicelCategory.route";
import { vehicleTypeRoutes } from "../module/vehicleType/vehicleType.route";
import { reviewRoutes } from "../module/review/review.route";
import { userRoutes } from "../module/user/user.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/fuel-price", fuelPriceRoutes);
router.use("/vehicle-category", vehicleCategoryRoutes);
router.use("/vehicle-type", vehicleTypeRoutes);
router.use("/review", reviewRoutes);

export const IndexRoutes = router;