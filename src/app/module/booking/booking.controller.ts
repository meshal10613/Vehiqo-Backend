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

export const bookingController = { createBooking };
