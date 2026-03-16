import { Router } from "express";
import { paymentController } from "./payment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
    "/create-session/:bookingId",
    checkAuth(UserRole.CUSTOMER),
    paymentController.createSession,
);

router.post(
    "/webhook",
    checkAuth(UserRole.CUSTOMER),
    paymentController.handleWebhook,
);

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

router.get("/", checkAuth(UserRole.ADMIN), paymentController.getAllPayments);

export const paymentRoutes = router;
