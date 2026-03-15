import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import {
    ICreateReviewPayload,
    IUpdateReviewPayload,
} from "./review.validation";

const createReview = async (userId: string, payload: ICreateReviewPayload) => {
    // Check vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
        where: { id: payload.vehicleId },
    });

    if (!vehicle) {
        throw new AppError(status.NOT_FOUND, "Vehicle not found");
    }

    // Check user has not already reviewed this vehicle
    const alreadyReviewed = await prisma.review.findUnique({
        where: {
            vehicleId_userId: {
                vehicleId: vehicle.id,
                userId,
            },
        },
    });

    if (alreadyReviewed) {
        throw new AppError(
            status.BAD_REQUEST,
            "You have already reviewed this vehicle",
        );
    }

    const result = await prisma.review.create({
        data: {
            ...payload,
            userId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            vehicle: {
                select: {
                    id: true,
                    brand: true,
                    model: true,
                },
            },
        },
    });

    return result;
};

const getAllReviews = async () => {
    const result = await prisma.review.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            vehicle: {
                select: {
                    id: true,
                    brand: true,
                    model: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return result;
};

const getReviewsByVehicleId = async (vehicleId: string) => {
    const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
    });

    if (!vehicle) {
        throw new AppError(status.NOT_FOUND, "Vehicle not found");
    }

    const result = await prisma.review.findMany({
        where: { vehicleId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return result;
};

const getReviewById = async (id: string) => {
    const result = await prisma.review.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            vehicle: {
                select: {
                    id: true,
                    brand: true,
                    model: true,
                },
            },
        },
    });

    if (!result) {
        throw new AppError(status.NOT_FOUND, "Review not found");
    }

    return result;
};

const updateReview = async (
    id: string,
    userId: string,
    payload: IUpdateReviewPayload,
) => {
    const isExist = await prisma.review.findUnique({
        where: { id },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Review not found");
    }

    // Only the owner can update their review
    if (isExist.userId !== userId) {
        throw new AppError(
            status.FORBIDDEN,
            "You are not allowed to update this review",
        );
    }

    const result = await prisma.review.update({
        where: { id },
        data: payload,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            vehicle: {
                select: {
                    id: true,
                    brand: true,
                    model: true,
                },
            },
        },
    });

    return result;
};

const deleteReview = async (id: string, userId: string) => {
    const isExist = await prisma.review.findUnique({
        where: { id },
    });

    if (!isExist) {
        throw new AppError(status.NOT_FOUND, "Review not found");
    }

    // Only the owner can delete their review
    if (isExist.userId !== userId) {
        throw new AppError(
            status.FORBIDDEN,
            "You are not allowed to delete this review",
        );
    }

    await prisma.review.delete({
        where: { id },
    });
};

export const reviewService = {
    createReview,
    getAllReviews,
    getReviewsByVehicleId,
    getReviewById,
    updateReview,
    deleteReview,
};
