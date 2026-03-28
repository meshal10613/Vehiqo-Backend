import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { bookingController } from "./booking.controller";

const router = Router();

// ── Create ────────────────────────────────────────────────────────────────────
// Validation + schema selection happens inside the controller, not here.
// This keeps the route file thin and avoids duplicating the role-switch logic.
router.post(
    "/",
    checkAuth(UserRole.CUSTOMER),
    bookingController.createBooking,
);

// ── Read (admin) ──────────────────────────────────────────────────────────────
router.get(
    "/",
    checkAuth(UserRole.ADMIN),
    bookingController.getAllBooking,
);

// ── Read (customer — own bookings) ────────────────────────────────────────────
router.get(
    "/my-booking",
    checkAuth(UserRole.CUSTOMER),
    bookingController.getMyBooking,
);

// ── Read single ───────────────────────────────────────────────────────────────
// Accessible to both roles; ownership check is enforced in the service.
router.get(
    "/:id",
    checkAuth(UserRole.CUSTOMER, UserRole.ADMIN),
    bookingController.getSingleBooking,
);

// ── Update ────────────────────────────────────────────────────────────────────
// Role-based schema selection happens inside the controller.
router.patch(
    "/:id",
    checkAuth(UserRole.CUSTOMER, UserRole.ADMIN),
    bookingController.updateBooking,
);

export const bookingRoutes = router;