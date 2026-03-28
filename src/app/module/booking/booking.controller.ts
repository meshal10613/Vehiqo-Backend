import status from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import {
    adminUpdateBookingSchema,
    createBookingSchema,
    customerUpdateBookingSchema,
} from "./booking.validation";
import { bookingService } from "./booking.service";
import { IQueryParams } from "../../interface/query.interface";

const createBooking = catchAsync(async (req, res) => {
    const result = await bookingService.createBooking(
        createBookingSchema.parse(req.body),
        req.user,
    );

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Booking created successfully",
        data: result,
    });
});

const getAllBooking = catchAsync(async (req, res) => {
    const result = await bookingService.getAllBooking(req.query as IQueryParams);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Bookings retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getMyBooking = catchAsync(async (req, res) => {
    const query = req.query;
    const result = await bookingService.getMyBooking(req.user, query as IQueryParams);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "My bookings retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getSingleBooking = catchAsync(async (req, res) => {
    const result = await bookingService.getSingleBooking(
        req.params.id as string,
        req.user,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Booking retrieved successfully",
        data: result,
    });
});

const updateBooking = catchAsync(async (req, res) => {
    const isAdmin = req.user.role === UserRole.ADMIN;

    // Pick the right schema based on who is calling.
    // Zod parse throws a ZodError on failure which catchAsync forwards to the
    // global error handler — no try/catch needed here.
    const payload = isAdmin
        ? adminUpdateBookingSchema.parse(req.body)
        : customerUpdateBookingSchema.parse(req.body);

    const result = await bookingService.updateBooking(
        req.params.id as string,
        payload,
        req.user.role,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Booking updated successfully",
        data: result,
    });
});

export const bookingController = {
    createBooking,
    getAllBooking,
    getMyBooking,
    getSingleBooking,
    updateBooking,
};
