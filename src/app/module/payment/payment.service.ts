import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import {
    BookingStatus,
    PaymentMethod,
    PaymentStatus,
    PaymentType,
    UserRole,
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
import { IRequestUser } from "../../interface/requestUser.interface";

// ─────────────────────────────────────────────────────────────────────────────
// createAdvancePaymentSession
// ─────────────────────────────────────────────────────────────────────────────
// Creates a Stripe Checkout session for the advance payment.
// The booking stays PENDING until the webhook confirms — the vehicle is not
// locked yet. A PENDING Payment record is created now so we have an ID to
// embed in Stripe metadata and correlate later in the webhook.
// ─────────────────────────────────────────────────────────────────────────────

const createAdvancePaymentSession = async (
    bookingId: string,
    user: IRequestUser,
) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true, vehicle: true },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    // Customers can only initiate payment for their own booking
    if (user.role === UserRole.CUSTOMER && booking.customerId !== user.userId) {
        throw new AppError(
            status.FORBIDDEN,
            "You do not have access to this booking",
        );
    }

    if (booking.status !== BookingStatus.PENDING) {
        throw new AppError(
            status.CONFLICT,
            "Advance payment is already initiated or completed for this booking",
        );
    }

    // Create a PENDING Payment record before the Stripe session so we have a
    // paymentId to embed in the session metadata. The record flips to PAID
    // (or FAILED) in the webhook handler.
    const payment = await prisma.payment.create({
        data: {
            type: PaymentType.ADVANCE,
            amount: booking.advanceAmount,
            method: PaymentMethod.STRIPE,
            status: PaymentStatus.PENDING,
            bookingId,
        },
    });

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
        metadata: {
            bookingId,
            paymentId: payment.id,
            paymentType: PaymentType.ADVANCE,
        },
        success_url: `${process.env.FRONTEND_URL}/bookings/${bookingId}/payment-success`,
        cancel_url: `${process.env.FRONTEND_URL}/bookings/${bookingId}/payment-failed`,
    });

    return {
        sessionId: session.id,
        sessionUrl: session.url,
        paymentId: payment.id,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// createRemainingPaymentSession
// ─────────────────────────────────────────────────────────────────────────────
// Called after admin processes the vehicle return and the final bill is
// computed. Only applicable when remainingDue > 0.
// ─────────────────────────────────────────────────────────────────────────────

const createRemainingPaymentSession = async (
    bookingId: string,
    user: IRequestUser,
) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true, vehicle: true },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    if (user.role === UserRole.CUSTOMER && booking.customerId !== user.userId) {
        throw new AppError(
            status.FORBIDDEN,
            "You do not have access to this booking",
        );
    }

    // Remaining payment only makes sense after the vehicle is returned
    if (booking.status !== BookingStatus.RETURNED) {
        throw new AppError(
            status.CONFLICT,
            "Remaining payment can only be initiated after the vehicle has been returned",
        );
    }

    if (booking.remainingDue <= 0) {
        throw new AppError(
            status.CONFLICT,
            "No remaining balance due for this booking",
        );
    }

    const payment = await prisma.payment.create({
        data: {
            type: PaymentType.FINAL,
            amount: booking.remainingDue,
            method: PaymentMethod.STRIPE,
            status: PaymentStatus.PENDING,
            bookingId,
        },
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: booking.customer.email,
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: "bdt",
                    unit_amount: Math.round(booking.remainingDue * 100),
                    product_data: {
                        name: `Final Payment — ${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.year}`,
                        description: `Remaining balance for booking ending ${booking.endDate.toLocaleDateString()}`,
                    },
                },
            },
        ],
        metadata: {
            bookingId,
            paymentId: payment.id,
            paymentType: PaymentType.FINAL,
        },
        success_url: `${process.env.FRONTEND_URL}/bookings/${bookingId}/payment-success`,
        cancel_url: `${process.env.FRONTEND_URL}/bookings/${bookingId}/payment-cancel`,
    });

    return {
        sessionId: session.id,
        sessionUrl: session.url,
        paymentId: payment.id,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// handleStripeWebhookEvent
// ─────────────────────────────────────────────────────────────────────────────
// Idempotent — guarded by stripeEventId @unique on the Payment model.
// If Stripe retries the same event, the findFirst check exits early.
//
// checkout.session.completed handles both ADVANCE and REMAINING payment types
// by reading paymentType from session metadata.
// ─────────────────────────────────────────────────────────────────────────────

const handleStripeWebhookEvent = async (event: Stripe.Event) => {
    // ── Idempotency guard ─────────────────────────────────────────────────────
    const existingPayment = await prisma.payment.findFirst({
        where: { stripeEventId: event.id },
    });

    if (existingPayment) {
        console.log(`[WEBHOOK] Event ${event.id} already processed — skipping`);
        return { message: `Event ${event.id} already processed` };
    }

    switch (event.type) {
        // ── Checkout succeeded ────────────────────────────────────────────────
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const bookingId = session.metadata?.bookingId;
            const paymentId = session.metadata?.paymentId;
            const paymentType = session.metadata?.paymentType as
                | PaymentType
                | undefined;

            if (!bookingId || !paymentId || !paymentType) {
                console.error("[WEBHOOK] Missing metadata in event", event.id);
                return { message: "Missing metadata" };
            }

            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { customer: true, vehicle: true },
            });

            if (!booking) {
                console.error(`[WEBHOOK] Booking ${bookingId} not found`);
                return { message: "Booking not found" };
            }

            const isPaid = session.payment_status === "paid";

            // ── Generate one transaction ID — reused for both PDF and DB ──────
            // Previously generateTransactionId() was called twice, producing
            // two different IDs: one embedded in the PDF and one stored in the
            // DB. They must match so the invoice is auditable.
            const transactionId = generateTransactionId();

            let invoiceUrl: string | null = null;

            if (isPaid) {
                try {
                    const paidAt = new Date();

                    const pdfBuffer = await generateInvoicePdf({
                        transactionId, // same ID goes on the PDF
                        paymentType,
                        paymentMethod: PaymentMethod.STRIPE,
                        paymentStatus: PaymentStatus.PAID,
                        paidAt,
                        customerName: booking.customer.name,
                        customerEmail: booking.customer.email,
                        vehicleName: `${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.year}`,
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

                    const cloudinaryResponse = await uploadFileToCloudinary(
                        pdfBuffer,
                        `vehicle-rental/invoices/invoice-${paymentId}-${Date.now()}.pdf`,
                    );

                    invoiceUrl = cloudinaryResponse?.secure_url ?? null;
                    console.log(
                        `[WEBHOOK] Invoice uploaded for payment ${paymentId}`,
                    );
                } catch (pdfError) {
                    // PDF failure must NOT block the payment from being recorded.
                    // The customer has paid; we owe them a confirmed booking.
                    console.error(
                        "[WEBHOOK] Invoice generation failed:",
                        pdfError,
                    );
                }
            }

            // ── Determine next booking status based on payment type ────────────
            // ADVANCE paid  → ADVANCE_PAID (vehicle becomes BOOKED in same tx)
            // REMAINING paid → COMPLETED   (vehicle returns to AVAILABLE)
            const nextBookingStatus = isPaid
                ? paymentType === PaymentType.ADVANCE
                    ? BookingStatus.ADVANCE_PAID
                    : BookingStatus.COMPLETED
                : booking.status; // leave unchanged on failure

            // ── Persist atomically ────────────────────────────────────────────
            const result = await prisma.$transaction(async (tx) => {
                const updatedPayment = await tx.payment.update({
                    where: { id: paymentId },
                    data: {
                        status: isPaid
                            ? PaymentStatus.PAID
                            : PaymentStatus.FAILED,
                        transactionId, // same ID that's printed on the invoice
                        invoiceUrl,
                        paidAt: isPaid ? new Date() : null,
                        stripeEventId: event.id,
                    },
                });

                const updatedBooking = await tx.booking.update({
                    where: { id: bookingId },
                    data: { status: nextBookingStatus },
                });

                // When advance is paid, lock the vehicle so nobody else books it
                if (isPaid && paymentType === PaymentType.ADVANCE) {
                    await tx.vehicle.update({
                        where: { id: booking.vehicleId },
                        data: { status: "BOOKED" },
                    });
                }

                // When final payment is done, release the vehicle
                if (isPaid && paymentType === PaymentType.FINAL) {
                    await tx.vehicle.update({
                        where: { id: booking.vehicleId },
                        data: { status: "AVAILABLE" },
                    });
                }

                return { updatedPayment, updatedBooking };
            });

            console.log(
                `[WEBHOOK] ${paymentType} payment ${session.payment_status} for booking ${bookingId}`,
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

    return { message: `Webhook event ${event.id} processed` };
};

const getPaymentsByBooking = async (bookingId: string, user: IRequestUser) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, customerId: true },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    // Ownership check — admin bypasses this
    if (user.role === UserRole.CUSTOMER && booking.customerId !== user.userId) {
        throw new AppError(
            status.FORBIDDEN,
            "You do not have access to this booking's payments",
        );
    }

    return prisma.payment.findMany({
        where: { bookingId },
        orderBy: { createdAt: "desc" },
    });
};

const getPaymentById = async (paymentId: string, user: IRequestUser) => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
    });

    if (!payment) {
        throw new AppError(status.NOT_FOUND, "Payment not found");
    }

    // Customers can only see their own payments
    if (
        user.role === UserRole.CUSTOMER &&
        payment.booking.customerId !== user.userId
    ) {
        throw new AppError(
            status.FORBIDDEN,
            "You do not have access to this payment",
        );
    }

    return payment;
};

const getMyPayments = async (user: IRequestUser, query: IQueryParams) => {
    const queryBuilder = new QueryBuilder<
        Payment,
        Prisma.PaymentWhereInput,
        Prisma.PaymentInclude
    >(prisma.payment, query, {
        searchableFields: paymentSearchableFields,
        filterableFields: paymentFilterableFields,
    });

    return queryBuilder
        .search()
        .filter()
        .where({ booking: { customerId: user.userId } })
        .include({
            booking: {
                include: {
                    customer: true,
                    vehicle: true,
                },
            },
        })
        .paginate()
        .sort()
        .fields()
        .execute();
};

const getAllPayments = async (query: IQueryParams) => {
    // Fixed: was prisma.user — must be prisma.payment
    const queryBuilder = new QueryBuilder<
        Payment,
        Prisma.PaymentWhereInput,
        Prisma.PaymentInclude
    >(prisma.payment, query, {
        searchableFields: paymentSearchableFields,
        filterableFields: paymentFilterableFields,
    });

    return queryBuilder
        .search()
        .filter()
        .include({
            booking: {
                include: {
                    customer: true,
                    vehicle: true,
                },
            },
        })
        .paginate()
        .sort()
        .fields()
        .execute();
};

const deletePayment = async (paymentId: string) => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
    });

    if (!payment) {
        throw new AppError(status.NOT_FOUND, "Payment not found");
    }

    return await prisma.payment.delete({ where: { id: paymentId } });
};

export const paymentService = {
    createAdvancePaymentSession,
    createRemainingPaymentSession,
    handleStripeWebhookEvent,
    getPaymentsByBooking,
    getPaymentById,
    getMyPayments,
    getAllPayments,
    deletePayment,
};
