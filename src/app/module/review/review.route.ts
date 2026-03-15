import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { createReviewSchema, updateReviewSchema } from "./review.validation";
import { reviewController } from "./review.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    validateRequest(createReviewSchema),
    reviewController.createReview,
);

router.get("/", reviewController.getAllReviews);

router.get("/vehicle/:vehicleId", reviewController.getReviewsByVehicleId);

router.get("/:id", reviewController.getReviewById);

router.patch(
    "/:id",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    validateRequest(updateReviewSchema),
    reviewController.updateReview,
);

router.delete(
    "/:id",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    reviewController.deleteReview,
);

export const reviewRoutes = router;
