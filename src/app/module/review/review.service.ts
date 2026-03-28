import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import {
    ICreateReviewPayload,
    IUpdateReviewPayload,
} from "./review.validation";
import { IRequestUser } from "../../interface/requestUser.interface";
import { IQueryParams } from "../../interface/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Prisma, Review, UserRole } from "../../../generated/prisma/client";
import {
    reviewFilterableFields,
    reviewSearchableFields,
} from "./review.constant";

const createReview = async (userId: string, payload: ICreateReviewPayload) => {
    // Check vehicle exists
    const booking = await prisma.booking.findUnique({
        where: { id: payload.bookingId },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    // Check user has not already reviewed this vehicle
    const alreadyReviewed = await prisma.review.findUnique({
        where: {
            bookingId_userId: {
                bookingId: booking.id,
                userId,
            },
        },
    });

    if (alreadyReviewed) {
        throw new AppError(
            status.BAD_REQUEST,
            "You have already reviewed this Booking",
        );
    }

    const result = await prisma.review.create({
        data: {
            ...payload,
            userId,
        },
        include: {
            user: true,
            booking: {
                include: {
                    vehicle: true,
                },
            }
        },
    });

    return result;
};

const getAllReviews = async (query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        Review,
        Prisma.ReviewWhereInput,
        Prisma.ReviewInclude
    >(prisma.review, query, {
        searchableFields: reviewSearchableFields,
        filterableFields: reviewFilterableFields,
    });

    const result = await queryBuilder
        .search()
        .filter()
        .include({
            user: true,
            booking: {
                include: {
                    vehicle: true,
                },
            },
        })
        // .dynamicInclude(doctorIncludeConfig)
        .paginate()
        .sort()
        .fields()
        .execute();

    return result;
};

const getMyReviews = async (user: IRequestUser, query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        Review,
        Prisma.ReviewWhereInput,
        Prisma.ReviewInclude
    >(prisma.review, query, {
        searchableFields: reviewSearchableFields,
        filterableFields: reviewFilterableFields,
    });

    const result = await queryBuilder
        .search()
        .filter()
        .where({
            userId: user.userId,
        })
        .include({
            user: true,
            booking: {
                include: {
                    vehicle: true,
                },
            },
        })
        // .dynamicInclude(doctorIncludeConfig)
        .paginate()
        .sort()
        .fields()
        .execute();

    return result;
};

const getReviewById = async (id: string) => {
    const result = await prisma.review.findUnique({
        where: { id },
        include: {
            user: true,
            booking: {
                include: {
                    vehicle: true,
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
            user: true,
            booking: {
                include: {
                    vehicle: true,
                }
            }
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

    // Only the owner & admin can delete their review
    if (isExist.userId !== userId && isExist.userId === UserRole.ADMIN) {
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
    getMyReviews,
    getReviewById,
    updateReview,
    deleteReview,
};
