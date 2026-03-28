import { Request, Response } from "express";
import status from "http-status"; // default import — NOT named { status }
import { envVars } from "../../config/env";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { paymentService } from "./payment.service";
import { stripe } from "../../config/stripe";
import { IQueryParams } from "../../interface/query.interface";
import {
    createSessionSchema,
    createRemainingSessionSchema,
} from "./payment.validation";
import { IRequestUser } from "../../interface/requestUser.interface";

// ── Advance payment session ───────────────────────────────────────────────────

const createSession = catchAsync(async (req: Request, res: Response) => {
    const { bookingId } = createSessionSchema.parse(req.body);

    const result = await paymentService.createAdvancePaymentSession(
        bookingId,
        req.user,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Checkout session created successfully",
        data: result,
    });
});


const createRemainingSession = catchAsync(
    async (req: Request, res: Response) => {
        const { bookingId } = createSessionSchema.parse(req.body);

        const result = await paymentService.createRemainingPaymentSession(
            bookingId,
            req.user,
        );

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Remaining payment session created successfully",
            data: result,
        });
    },
);

// ── Stripe webhook ────────────────────────────────────────────────────────────
// No auth middleware on this route — requests come from Stripe, not a logged-in
// user. Authenticity is verified by constructEvent() using the webhook secret.
//
// IMPORTANT: This route must receive the raw request body (Buffer), not the
// JSON-parsed body. Ensure express.raw() is applied to this route BEFORE
// express.json() in your app entry point (already confirmed as set up).

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    const webhookSecret = envVars.STRIPE.WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
        console.error("[WEBHOOK] Missing Stripe signature or webhook secret");
        return res.status(status.BAD_REQUEST).json({
            message: "Missing Stripe signature or webhook secret",
        });
    }

    let event;
    try {
        // req.body must be a raw Buffer here — express.raw() is required
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            webhookSecret,
        );
    } catch (err: any) {
        console.error("[WEBHOOK] Signature verification failed:", err.message);
        return res.status(status.BAD_REQUEST).json({
            message: `Webhook signature verification failed: ${err.message}`,
        });
    }

    try {
        const result = await paymentService.handleStripeWebhookEvent(event);

        sendResponse(res, {
            httpStatusCode: status.OK,
            success: true,
            message: "Webhook event processed successfully",
            data: result,
        });
    } catch (error) {
        // Always return 200 to Stripe even on handler errors — returning non-2xx
        // will cause Stripe to retry the event indefinitely, which is worse than
        // logging the failure and investigating manually.
        console.error("[WEBHOOK] Handler error:", error);
        sendResponse(res, {
            httpStatusCode: status.OK,
            success: false,
            message: "Webhook received but handler encountered an error",
        });
    }
});

// ── Queries ───────────────────────────────────────────────────────────────────

const getPaymentsByBooking = catchAsync(async (req: Request, res: Response) => {
    const payments = await paymentService.getPaymentsByBooking(
        req.params.bookingId as string,
        req.user,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payments fetched successfully",
        data: payments,
    });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
    const payment = await paymentService.getPaymentById(
        req.params.id as string,
        req.user,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payment fetched successfully",
        data: payment,
    });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
    const payments = await paymentService.getMyPayments(
        req.user as IRequestUser,
        req.query as IQueryParams,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "My payments fetched successfully",
        data: payments.data,
        meta: payments.meta,
    });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
    const payments = await paymentService.getAllPayments(
        req.query as IQueryParams,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payments fetched successfully",
        data: payments.data,
        meta: payments.meta,
    });
});

const deletePayment = catchAsync(async (req: Request, res: Response) => {
    const payments = await paymentService.deletePayment(
        req.params.id as string,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payments deleted successfully",
        data: null
    });
});

export const paymentController = {
    createSession,
    createRemainingSession,
    handleWebhook,
    getPaymentsByBooking,
    getPaymentById,
    getMyPayments,
    getAllPayments,
    deletePayment,
};
