import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { bookingController } from "./booking.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createBookingSchema } from "./booking.validation";

const router = Router();

router.post(
    "/",
    checkAuth(UserRole.CUSTOMER),
    validateRequest(createBookingSchema),
    bookingController.createBooking,
);

export const bookingRoutes = router;
