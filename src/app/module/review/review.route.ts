import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { createReviewSchema, updateReviewSchema } from "./review.validation";
import { reviewController } from "./review.controller";

const router = Router();

router.post(
    "/",
    validateRequest(createReviewSchema),
    reviewController.createReview,
);

router.get("/", reviewController.getAllReviews);

router.get("/vehicle/:vehicleId", reviewController.getReviewsByVehicleId);

router.get("/:id", reviewController.getReviewById);

router.patch(
    "/:id",
    validateRequest(updateReviewSchema),
    reviewController.updateReview,
);

router.delete("/:id", reviewController.deleteReview);

export const reviewRoutes = router;
