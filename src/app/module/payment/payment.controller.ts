import { Request, Response } from "express";
import { status } from "http-status";
import { envVars } from "../../config/env";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { paymentService } from "./payment.service";
import { stripe } from "../../config/stripe";
import { IQueryParams } from "../../interface/query.interface";

const createSession = catchAsync(async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    const result = await paymentService.createAdvancePaymentSession(
        bookingId as string,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Checkout session created successfully",
        data: result, // { sessionId, sessionUrl, paymentId }
    });
});

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
        console.error("[WEBHOOK] Handler error:", error);
        sendResponse(res, {
            httpStatusCode: status.OK,
            success: false,
            message: "Webhook received but handler encountered an error",
        });
    }
});

const getPaymentsByBooking = catchAsync(async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    const payments = await paymentService.getPaymentsByBooking(
        bookingId as string,
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payments fetched successfully",
        data: payments,
    });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const payment = await paymentService.getPaymentById(id as string);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payment fetched successfully",
        data: payment,
    });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
    const payments = await paymentService.getAllPayments(req.query as IQueryParams);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payments fetched successfully",
        data: payments,
    });
});

export const paymentController = {
    createSession,
    handleWebhook,
    getPaymentsByBooking,
    getPaymentById,
    getAllPayments,
};
