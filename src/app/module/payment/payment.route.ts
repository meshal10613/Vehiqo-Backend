import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { paymentController } from "./payment.controller";

const router = Router();

router.post(
    "/create-session",
    checkAuth(UserRole.CUSTOMER),
    paymentController.createSession,
);

router.post(
    "/create-remaining-session",
    checkAuth(UserRole.CUSTOMER),
    paymentController.createRemainingSession,
);

router.get("/", checkAuth(UserRole.ADMIN), paymentController.getAllPayments);
router.get("/my-payment", checkAuth(UserRole.CUSTOMER), paymentController.getMyPayments);

router.get(
    "/booking/:bookingId",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    paymentController.getPaymentsByBooking,
);

router.get(
    "/:id",
    checkAuth(UserRole.ADMIN, UserRole.CUSTOMER),
    paymentController.getPaymentById,
);

router.delete(
    "/:id",
    checkAuth(UserRole.ADMIN),
    paymentController.deletePayment,
);

export const paymentRoutes = router;
