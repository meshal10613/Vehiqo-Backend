import PDFDocument from "pdfkit";
import {
    PaymentMethod,
    PaymentStatus,
    PaymentType,
} from "../../../generated/prisma/enums";

interface InvoiceData {
    // Payment meta
    transactionId: string;
    paymentType: PaymentType;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    paidAt: Date;

    // Customer
    customerName: string;
    customerEmail: string;

    // Vehicle
    vehicleName: string;
    licensePlate: string;

    // Booking schedule
    startDate: Date;
    endDate: Date;
    totalDays: number;

    // Pricing
    pricePerDay: number;
    baseCost: number;
    extraDays: number;
    lateFee: number;
    fuelCharge: number;
    fuelCredit: number;
    damageCharge: number;
    totalCost: number;
    advanceAmount: number;
    remainingDue: number;
}

export const generateInvoicePdf = (data: InvoiceData): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // ── Colors ────────────────────────────────────────────────────────────
        const primary = "#1a1a2e";
        const accent = "#4f46e5";
        const grey = "#6b7280";
        const light = "#f3f4f6";
        const green = "#16a34a";
        const red = "#dc2626";
        const white = "#ffffff";
        const yellow = "#d97706";

        const pageW = doc.page.width;
        const col1X = 50;
        const col2X = 320;
        const colW = 225;

        // ── Helpers ───────────────────────────────────────────────────────────
        const currency = (n: number) =>
            `৳ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

        // Payment type label
        const paymentTypeLabel: Record<string, string> = {
            ADVANCE: "Advance Payment",
            FINAL: "Final Payment",
            PARTIAL: "Partial Payment",
        };

        // Payment method label + icon prefix
        const paymentMethodLabel: Record<string, string> = {
            STRIPE: "💳 Stripe",
            CASH: "💵 Cash",
            BANK_TRANSFER: "🏦 Bank Transfer",
        };

        // Payment status → color
        const statusColor: Record<string, string> = {
            COMPLETED: green,
            PENDING: yellow,
            FAILED: red,
            REFUNDED: grey,
        };

        const statusBg: Record<string, string> = {
            COMPLETED: "#dcfce7",
            PENDING: "#fef9c3",
            FAILED: "#fee2e2",
            REFUNDED: "#f3f4f6",
        };

        // ── Header bar ────────────────────────────────────────────────────────
        doc.rect(0, 0, pageW, 80).fill(primary);

        doc.fillColor(white)
            .fontSize(22)
            .font("Helvetica-Bold")
            .text("Vehiqo", col1X, 22);

        doc.fillColor(accent)
            .fontSize(10)
            .font("Helvetica")
            .text(
                paymentTypeLabel[data.paymentType] ?? data.paymentType,
                col1X,
                50,
            );

        doc.fillColor(white)
            .fontSize(9)
            .text(`Invoice #${data.transactionId}`, 0, 50, { align: "right" });

        // ── Date + payment meta row ───────────────────────────────────────────
        doc.moveDown(3.5);
        const metaY = doc.y;

        // Date issued
        doc.fillColor(grey)
            .fontSize(8)
            .font("Helvetica")
            .text("DATE ISSUED", col1X, metaY);
        doc.fillColor(primary)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(
                data.paidAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }),
                col1X,
                metaY + 12,
            );

        // Payment method
        doc.fillColor(grey)
            .fontSize(8)
            .font("Helvetica")
            .text("PAYMENT METHOD", col2X, metaY);
        doc.fillColor(primary)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(
                paymentMethodLabel[data.paymentMethod] ?? data.paymentMethod,
                col2X,
                metaY + 12,
            );

        // ── Payment status badge ──────────────────────────────────────────────
        const badgeY = metaY + 38;
        const badgeBg = statusBg[data.paymentStatus] ?? "#f3f4f6";
        const badgeFg = statusColor[data.paymentStatus] ?? grey;
        const badgeLabel = data.paymentStatus; // e.g. "COMPLETED"

        doc.rect(col1X, badgeY, 130, 28).fill(badgeBg);
        doc.fillColor(badgeFg)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(
                `${data.paymentStatus === "PAID" ? "✓" : "●"}  ${badgeLabel}`,
                col1X + 10,
                badgeY + 9,
            );

        // Payment type pill (right side)
        doc.rect(col2X, badgeY, 130, 28).fill(light);
        doc.fillColor(accent)
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(
                paymentTypeLabel[data.paymentType] ?? data.paymentType,
                col2X + 10,
                badgeY + 9,
            );

        // ── Info cards (Customer | Vehicle) ───────────────────────────────────
        const cardY = badgeY + 44;
        const cardH = 90;

        // Customer card
        doc.rect(col1X, cardY, colW, cardH).fill(light);
        doc.fillColor(accent)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("BILLED TO", col1X + 12, cardY + 12);
        doc.fillColor(primary)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(data.customerName, col1X + 12, cardY + 26);
        doc.fillColor(grey)
            .fontSize(9)
            .font("Helvetica")
            .text(data.customerEmail, col1X + 12, cardY + 42);

        // Vehicle card
        doc.rect(col2X, cardY, colW, cardH).fill(light);
        doc.fillColor(accent)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("VEHICLE", col2X + 12, cardY + 12);
        doc.fillColor(primary)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(data.vehicleName, col2X + 12, cardY + 26);
        doc.fillColor(grey)
            .fontSize(9)
            .font("Helvetica")
            .text(`Plate: ${data.licensePlate}`, col2X + 12, cardY + 42)
            .text(
                `${data.startDate.toLocaleDateString("en-GB")} → ${data.endDate.toLocaleDateString("en-GB")}`,
                col2X + 12,
                cardY + 56,
            )
            .text(`${data.totalDays} day(s)`, col2X + 12, cardY + 70);

        // ── Charges table ─────────────────────────────────────────────────────
        const tableY = cardY + cardH + 24;
        const tableW = pageW - col1X * 2;
        const col = {
            desc: col1X + 12,
            qty: col1X + 220,
            rate: col1X + 305,
            amount: col1X + 415,
        };

        // Table header
        doc.rect(col1X, tableY, tableW, 26).fill(primary);
        doc.fillColor(white)
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("DESCRIPTION", col.desc, tableY + 9)
            .text("QTY", col.qty, tableY + 9)
            .text("RATE", col.rate, tableY + 9)
            .text("AMOUNT", col.amount, tableY + 9);

        // Table rows — surcharges hidden when zero
        const rows: {
            desc: string;
            qty: string;
            rate: string;
            amount: string;
        }[] = [
            {
                desc: "Daily Rental",
                qty: `${data.totalDays} days`,
                rate: currency(data.pricePerDay),
                amount: currency(data.baseCost),
            },
            ...(data.extraDays > 0
                ? [
                      {
                          desc: "Late Return (×1.2 penalty rate)",
                          qty: `${data.extraDays} extra day(s)`,
                          rate: currency(data.pricePerDay * 1.2),
                          amount: currency(data.lateFee),
                      },
                  ]
                : []),
            ...(data.fuelCharge > 0
                ? [
                      {
                          desc: "Fuel Charge",
                          qty: "—",
                          rate: "—",
                          amount: currency(data.fuelCharge),
                      },
                  ]
                : []),
            ...(data.fuelCredit > 0
                ? [
                      {
                          desc: "Fuel Credit (deduction)",
                          qty: "—",
                          rate: "—",
                          amount: `- ${currency(data.fuelCredit)}`,
                      },
                  ]
                : []),
            ...(data.damageCharge > 0
                ? [
                      {
                          desc: "Damage Charge",
                          qty: "—",
                          rate: "—",
                          amount: currency(data.damageCharge),
                      },
                  ]
                : []),
            ...(data.damageCharge > 0
                ? [
                      {
                          desc: "Damage Charge",
                          qty: "—",
                          rate: "—",
                          amount: currency(data.damageCharge),
                      },
                  ]
                : []),
        ];

        let rowY = tableY + 26;
        rows.forEach((row, i) => {
            if (i % 2 === 0) doc.rect(col1X, rowY, tableW, 28).fill(light);

            doc.fillColor(primary)
                .fontSize(9)
                .font("Helvetica")
                .text(row.desc, col.desc, rowY + 10)
                .text(row.qty, col.qty, rowY + 10)
                .text(row.rate, col.rate, rowY + 10)
                .text(row.amount, col.amount, rowY + 10);

            rowY += 28;
        });

        // ── Summary box ───────────────────────────────────────────────────────
        const surchargeCount =
            (data.lateFee > 0 ? 1 : 0) +
            (data.fuelCharge > 0 ? 1 : 0) +
            (data.fuelCredit > 0 ? 1 : 0) +
            (data.damageCharge > 0 ? 1 : 0);

        const summaryY = rowY + 20;
        const summaryH = 110 + surchargeCount * 18;

        doc.rect(col2X, summaryY, colW, summaryH).fill(light);

        // Summary line helper
        const summaryLine = (
            label: string,
            value: string,
            y: number,
            bold = false,
            color = "",
        ) => {
            doc.fillColor(color || (bold ? primary : grey))
                .fontSize(bold ? 10 : 9)
                .font(bold ? "Helvetica-Bold" : "Helvetica")
                .text(label, col2X + 12, y)
                .text(value, col2X + 12, y, {
                    width: colW - 24,
                    align: "right",
                });
        };

        const divider = (y: number) => {
            doc.moveTo(col2X + 12, y)
                .lineTo(col2X + colW - 12, y)
                .strokeColor(grey)
                .lineWidth(0.5)
                .stroke();
        };

        let sy = summaryY + 12;

        summaryLine("Base Cost", currency(data.baseCost), sy);

        if (data.lateFee > 0) {
            sy += 18;
            summaryLine("Late Fee", currency(data.lateFee), sy);
        }
        if (data.fuelCharge > 0) {
            sy += 18;
            summaryLine("Fuel Charge", currency(data.fuelCharge), sy);
        }
        if (data.fuelCredit > 0) {
            sy += 18;
            summaryLine("Fuel Credit", `- ${currency(data.fuelCredit)}`, sy);
        }
        if (data.damageCharge > 0) {
            sy += 18;
            summaryLine("Damage Charge", currency(data.damageCharge), sy);
        }

        sy += 14;
        divider(sy);
        sy += 10;
        summaryLine("Total Cost", currency(data.totalCost), sy, true);
        sy += 18;
        summaryLine("Advance Paid", `- ${currency(data.advanceAmount)}`, sy);
        sy += 14;
        divider(sy);
        sy += 10;
        summaryLine(
            "Remaining Due",
            currency(data.remainingDue),
            sy,
            true,
            data.remainingDue === 0 ? green : red,
        );

        // ── Payment info box (left of summary) ────────────────────────────────
        const infoBoxW = colW - 10;
        const infoBoxH = 80;
        doc.rect(col1X, summaryY, infoBoxW, infoBoxH).fill(light);

        doc.fillColor(accent)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("PAYMENT DETAILS", col1X + 12, summaryY + 10);

        doc.fillColor(grey)
            .fontSize(8)
            .font("Helvetica")
            .text("Type", col1X + 12, summaryY + 26)
            .text("Method", col1X + 12, summaryY + 40)
            .text("Status", col1X + 12, summaryY + 54);

        doc.fillColor(primary)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(
                paymentTypeLabel[data.paymentType] ?? data.paymentType,
                col1X + 80,
                summaryY + 26,
            )
            .text(
                paymentMethodLabel[data.paymentMethod] ?? data.paymentMethod,
                col1X + 80,
                summaryY + 40,
            );

        // Status with color
        doc.fillColor(statusColor[data.paymentStatus] ?? grey)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(data.paymentStatus, col1X + 80, summaryY + 54);

        // ── Footer ────────────────────────────────────────────────────────────
        const footerY = doc.page.height - 55;
        doc.rect(0, footerY, pageW, 55).fill(primary);

        doc.fillColor(white)
            .fontSize(8)
            .font("Helvetica")
            .text(
                "Thank you for choosing our vehicle rental service.",
                0,
                footerY + 14,
                { align: "center" },
            );

        doc.fillColor(grey)
            .fontSize(7)
            .text(
                `Transaction ID: ${data.transactionId}  •  Generated: ${new Date().toISOString()}`,
                0,
                footerY + 30,
                { align: "center" },
            );

        doc.end();
    });
};
