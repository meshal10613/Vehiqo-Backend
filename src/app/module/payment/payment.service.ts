// ── 1. Create Stripe Checkout Session ────────────────────────────────────────
// Following your previous project's pattern — checkout session instead of

import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import {
    BookingStatus,
    PaymentMethod,
    PaymentStatus,
    PaymentType,
} from "../../../generated/prisma/enums";
import { stripe } from "../../config/stripe";
import Stripe from "stripe";
import { generateTransactionId } from "../../utils/generateTransactionId";
import { generateInvoicePdf } from "./payment.utils";
import { uploadFileToCloudinary } from "../../config/cloudinary";
import { IQueryParams } from "../../interface/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Payment, Prisma } from "../../../generated/prisma/client";
import {
    paymentFilterableFields,
    paymentSearchableFields,
} from "./payment.constant";

const createAdvancePaymentSession = async (bookingId: string) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true, vehicle: true },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    if (booking.status !== BookingStatus.PENDING) {
        throw new AppError(
            status.CONFLICT,
            "Advance payment already initiated or completed for this booking",
        );
    }

    // Create a pending Payment record first so we have an ID for metadata
    // stripeEventId is null until the webhook confirms it
    const payment = await prisma.payment.create({
        data: {
            type: PaymentType.ADVANCE,
            amount: booking.advanceAmount,
            method: PaymentMethod.STRIPE,
            status: PaymentStatus.PENDING,
            bookingId,
        },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: booking.customer.email,
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: "bdt",
                    unit_amount: Math.round(booking.advanceAmount * 100),
                    product_data: {
                        name: `Advance Payment — ${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.year}`,
                        description: `Booking from ${booking.startDate.toLocaleDateString()} to ${booking.endDate.toLocaleDateString()}`,
                    },
                },
            },
        ],
        // Metadata links the session back to our records in the webhook
        metadata: {
            bookingId,
            paymentId: payment.id,
        },
        success_url: `${process.env.FRONTEND_URL}/bookings/${bookingId}/payment-success`,
        cancel_url: `${process.env.FRONTEND_URL}/bookings/${bookingId}/payment-cancel`,
    });

    return {
        sessionId: session.id,
        sessionUrl: session.url, // redirect customer to this URL
        paymentId: payment.id,
    };
};

const handleStripeWebhookEvent = async (event: Stripe.Event) => {
    // ── Idempotency guard ─────────────────────────────────────────────────────
    // Stripe may send the same event multiple times (retries on non-2xx).
    // If we've already processed this event ID, skip silently.
    const existingPayment = await prisma.payment.findFirst({
        where: { stripeEventId: event.id },
    });

    if (existingPayment) {
        console.log(`[WEBHOOK] Event ${event.id} already processed. Skipping.`);
        return { message: `Event ${event.id} already processed` };
    }

    switch (event.type) {
        // ── Payment succeeded ─────────────────────────────────────────────────
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            const bookingId = session.metadata?.bookingId;
            const paymentId = session.metadata?.paymentId;

            if (!bookingId || !paymentId) {
                console.error("[WEBHOOK] Missing metadata in event", event.id);
                return { message: "Missing metadata" };
            }

            // Fetch full booking for invoice generation
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { customer: true, vehicle: true },
            });

            if (!booking) {
                console.error(`[WEBHOOK] Booking ${bookingId} not found`);
                return { message: "Booking not found" };
            }

            const isPaid = session.payment_status === "paid";

            let invoiceUrl: string | null = null;
            let pdfBuffer: Buffer | null = null;

            // ── Generate invoice PDF if payment succeeded ─────────────────────
            if (isPaid) {
                try {
                    const transactionId = generateTransactionId();
                    const paidAt = new Date();

                    pdfBuffer = await generateInvoicePdf({
                        transactionId,
                        paymentType: PaymentType.ADVANCE,
                        paymentMethod: PaymentMethod.STRIPE,
                        paymentStatus: PaymentStatus.PAID,
                        paidAt,
                        customerName: booking.customer.name,
                        customerEmail: booking.customer.email,
                        vehicleName:
                            booking.vehicle.brand +
                            " " +
                            booking.vehicle.model +
                            " " +
                            booking.vehicle.year,
                        licensePlate: booking.vehicle.plateNo,
                        startDate: booking.startDate,
                        endDate: booking.endDate,
                        totalDays: booking.totalDays,
                        pricePerDay: booking.pricePerDay,
                        baseCost: booking.baseCost,
                        extraDays: booking.extraDays,
                        lateFee: booking.lateFee,
                        fuelCharge: booking.fuelCharge,
                        fuelCredit: booking.fuelCredit,
                        damageCharge: booking.damageCharge,
                        totalCost: booking.totalCost,
                        advanceAmount: booking.advanceAmount,
                        remainingDue: booking.remainingDue,
                    });

                    // Upload to Cloudinary using your existing config util
                    const cloudinaryResponse = await uploadFileToCloudinary(
                        pdfBuffer,
                        `vehicle-rental/invoices/invoice-${paymentId}-${Date.now()}.pdf`,
                    );

                    invoiceUrl = cloudinaryResponse?.secure_url ?? null;

                    console.log(
                        `[WEBHOOK] Invoice uploaded for payment ${paymentId}`,
                    );
                } catch (pdfError) {
                    // PDF failure should NOT block the payment from being recorded
                    console.error(
                        "[WEBHOOK] Invoice generation failed:",
                        pdfError,
                    );
                }
            }

            // ── Persist payment + booking status atomically ───────────────────
            const result = await prisma.$transaction(async (tx) => {
                const updatedPayment = await tx.payment.update({
                    where: { id: paymentId },
                    data: {
                        status: isPaid
                            ? PaymentStatus.PAID
                            : PaymentStatus.FAILED,
                        transactionId: generateTransactionId(),
                        invoiceUrl,
                        paidAt: isPaid ? new Date() : null,
                        stripeEventId: event.id, // idempotency key
                    },
                });

                const updatedBooking = await tx.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: isPaid
                            ? BookingStatus.ADVANCE_PAID
                            : BookingStatus.PENDING, // stay PENDING on failure
                    },
                });

                return { updatedPayment, updatedBooking };
            });

            console.log(
                `[WEBHOOK] Payment ${session.payment_status} for booking ${bookingId}`,
            );
            return result;
        }

        // ── Session expired (customer abandoned checkout) ─────────────────────
        case "checkout.session.expired": {
            const session = event.data.object as Stripe.Checkout.Session;
            const paymentId = session.metadata?.paymentId;

            if (paymentId) {
                await prisma.payment.update({
                    where: { id: paymentId },
                    data: {
                        status: PaymentStatus.FAILED,
                        stripeEventId: event.id,
                    },
                });
            }

            console.log(`[WEBHOOK] Checkout session ${session.id} expired`);
            break;
        }

        // ── Payment intent failed ─────────────────────────────────────────────
        case "payment_intent.payment_failed": {
            const intent = event.data.object as Stripe.PaymentIntent;
            console.log(`[WEBHOOK] PaymentIntent ${intent.id} failed`);
            break;
        }

        default:
            console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return { message: `Webhook event ${event.id} processed successfully` };
};

const getPaymentsByBooking = async (bookingId: string) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    return prisma.payment.findMany({
        where: { bookingId },
        orderBy: { createdAt: "desc" },
    });
};

const getPaymentById = async (paymentId: string) => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
    });

    if (!payment) {
        throw new AppError(status.NOT_FOUND, "Payment not found");
    }

    return payment;
};

const getAllPayments = async (query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        Payment,
        Prisma.PaymentWhereInput,
        Prisma.PaymentInclude
    >(prisma.user, query, {
        searchableFields: paymentSearchableFields,
        filterableFields: paymentFilterableFields,
    });

    const result = await queryBuilder
        .search()
        .filter()
        // .where({
        // 	isDeleted: false,
        // })
        .include({
            booking: {
                include: {
                    customer: true,
                    vehicle: true,
                },
            },
        })
        // .dynamicInclude(doctorIncludeConfig)
        .paginate()
        .sort()
        .fields()
        .execute();

    return result;
};

export const paymentService = {
    createAdvancePaymentSession,
    handleStripeWebhookEvent,
    getPaymentsByBooking,
    getPaymentById,
    getAllPayments,
};
