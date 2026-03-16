import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { bookingController } from "./booking.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createBookingSchema, updateBookingSchema } from "./booking.validation";

const router = Router();

router.post(
    "/",
    checkAuth(UserRole.CUSTOMER),
    validateRequest(createBookingSchema),
    bookingController.createBooking,
);

router.get("/", checkAuth(UserRole.ADMIN), bookingController.getAllBooking);

router.get(
    "/my-booking",
    checkAuth(UserRole.CUSTOMER),
    bookingController.getMyBooking,
);

router.patch(
    "/:id",
    checkAuth(UserRole.CUSTOMER, UserRole.ADMIN),
    validateRequest(updateBookingSchema),
    bookingController.updateBooking,
);

export const bookingRoutes = router;
