import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { createReviewSchema, updateReviewSchema } from "./review.validation";
import { reviewController } from "./review.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/",
    checkAuth(UserRole.CUSTOMER),
    validateRequest(createReviewSchema),
    reviewController.createReview,
);

router.get("/", reviewController.getAllReviews);

router.get(
    "/my-review",
    checkAuth(UserRole.CUSTOMER),
    reviewController.getMyReviews,
);

router.get("/:id", reviewController.getReviewById);

router.patch(
    "/:id",
    checkAuth(UserRole.CUSTOMER),
    validateRequest(updateReviewSchema),
    reviewController.updateReview,
);

router.delete(
    "/:id",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    reviewController.deleteReview,
);

export const reviewRoutes = router;
