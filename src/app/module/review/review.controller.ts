import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { reviewService } from "./review.service";

const createReview = catchAsync(async (req, res) => {
    const userId = req.user.userId;
    const result = await reviewService.createReview(userId, req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Review created successfully",
        data: result,
    });
});

const getAllReviews = catchAsync(async (req, res) => {
    const result = await reviewService.getAllReviews();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Reviews retrieved successfully",
        data: result,
    });
});

const getReviewsByVehicleId = catchAsync(async (req, res) => {
    const { vehicleId } = req.params;
    const result = await reviewService.getReviewsByVehicleId(vehicleId as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Vehicle reviews retrieved successfully",
        data: result,
    });
});

const getReviewById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await reviewService.getReviewById(id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Review retrieved successfully",
        data: result,
    });
});

const updateReview = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const result = await reviewService.updateReview(id as string, userId, req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Review updated successfully",
        data: result,
    });
});

const deleteReview = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    await reviewService.deleteReview(id as string, userId);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Review deleted successfully",
        data: null,
    });
});

export const reviewController = {
    createReview,
    getAllReviews,
    getReviewsByVehicleId,
    getReviewById,
    updateReview,
    deleteReview,
};
