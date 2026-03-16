import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { bookingService } from "./booking.service";

const createBooking = catchAsync(async (req, res) => {
    const payload = req.body;
    const user = req.user;
    const result = await bookingService.createBooking(payload, user);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Booking created successfully",
        data: result,
    });
});

const getAllBooking = catchAsync(async (req, res) => {
    const result = await bookingService.getAllBooking();

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Bookings retrieved successfully",
        data: result,
    });
});

const getMyBooking = catchAsync(async (req, res) => {
    const user = req.user;
    const result = await bookingService.getMyBooking(user);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "My bookings retrieved successfully",
        data: result,
    });
});

export const updateBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const booking = await bookingService.updateBooking(id as string, req.body);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Booking updated successfully",
        data: booking,
    });
});

export const bookingController = {
    createBooking,
    getAllBooking,
    getMyBooking,
    updateBooking,
};
