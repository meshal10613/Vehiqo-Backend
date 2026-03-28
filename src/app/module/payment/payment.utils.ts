import PDFDocument from "pdfkit";
import {
    PaymentMethod,
    PaymentStatus,
    PaymentType,
} from "../../../generated/prisma/enums";

export interface InvoiceData {
    transactionId: string;
    paymentType: PaymentType;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    paidAt: Date;
    customerName: string;
    customerEmail: string;
    vehicleName: string;
    licensePlate: string;
    startDate: Date;
    endDate: Date;
    totalDays: number;
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
        try {
            // ── Key: autoFirstPage false + bufferPages true prevents any
            //    auto page additions. We add exactly one page manually.
            const doc = new PDFDocument({
                size: "A4",
                margin: 0,
                autoFirstPage: false,
                bufferPages: true,
            });

            const chunks: Buffer[] = [];
            doc.on("data", (c) => chunks.push(c));
            doc.on("end",  () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            doc.addPage();

            // ── Page dimensions ───────────────────────────────────────────────
            const PW = 595.28;   // A4 width  (pts)
            const PH = 841.89;   // A4 height (pts)
            const M  = 40;       // side margin
            const CW = PW - M * 2; // content width = 515.28

            // ── Colors ────────────────────────────────────────────────────────
            const BRAND  = "#FF5100";
            const BDARK  = "#cc4100";
            const BLIGHT = "#fff3ee";
            const BMID   = "#ffe0d0";
            const DARK   = "#1c1917";
            const GREY   = "#78716c";
            const LGREY  = "#f5f5f4";
            const BDR    = "#e7e5e4";
            const WHITE  = "#ffffff";
            const GREEN  = "#16a34a";
            const RED    = "#dc2626";
            const AMBER  = "#d97706";

            // ── Helpers ───────────────────────────────────────────────────────
            const curr = (n: number) =>
                `BDT ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

            const fmtDate = (d: Date, short = false) =>
                short
                    ? d.toLocaleDateString("en-GB")
                    : d.toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric",
                      });

            // Draw text absolutely — NEVER advances PDFKit's internal cursor
            // because lineBreak:false + explicit x,y keeps cursor in place.
            const txt = (
                str: string,
                x: number,
                y: number,
                opts: {
                    size?: number;
                    bold?: boolean;
                    color?: string;
                    opacity?: number;
                    align?: "left" | "center" | "right";
                    width?: number;
                } = {},
            ) => {
                const {
                    size = 9,
                    bold = false,
                    color = DARK,
                    opacity = 1,
                    align = "left",
                    width = CW,
                } = opts;
                doc.font(bold ? "Helvetica-Bold" : "Helvetica")
                    .fontSize(size)
                    .fillColor(color)
                    .fillOpacity(opacity)
                    .text(str, x, y, { lineBreak: false, align, width })
                    .fillOpacity(1);
            };

            const labelTypeMap: Record<string, string> = {
                ADVANCE: "Advance Payment",
                FINAL:   "Final Payment",
                PARTIAL: "Partial Payment",
            };
            const labelMethodMap: Record<string, string> = {
                STRIPE:        "Stripe (Online)",
                CASH:          "Cash",
                BANK_TRANSFER: "Bank Transfer",
            };
            const statusColorMap: Record<string, string> = {
                COMPLETED: GREEN, PAID: GREEN,
                PENDING:   AMBER, FAILED: RED, REFUNDED: GREY,
            };
            const statusBgMap: Record<string, string> = {
                COMPLETED: "#dcfce7", PAID: "#dcfce7",
                PENDING: "#fef9c3", FAILED: "#fee2e2", REFUNDED: "#f3f4f6",
            };

            // ── Layout constants — every Y is computed from these ─────────────
            const HDR_H  = 76;   // header bar
            const META_H = 48;   // meta row (date/method/status)
            const DIV_H  = 1;    // brand divider
            const CARD_H = 82;   // info cards
            const GAP    = 10;   // generic vertical gap

            // Table
            const TBL_HDR_H = 24;
            const ROW_H     = 22;
            const surcharges =
                (data.extraDays    > 0 ? 1 : 0) +
                (data.fuelCharge   > 0 ? 1 : 0) +
                (data.fuelCredit   > 0 ? 1 : 0) +
                (data.damageCharge > 0 ? 1 : 0);
            const TBL_H = TBL_HDR_H + ROW_H * (1 + surcharges); // base row + conditionals

            // Summary / payment boxes
            const SUM_ROWS = 3 + surcharges; // base+total+advance + conditionals
            const BOX_H    = 18 + SUM_ROWS * 16 + 40; // label + rows + dividers + due row

            const FTR_H = 44;   // footer bar

            // Stack everything:
            let Y = 0;
            const HDR_Y  = Y;                            Y += HDR_H;
            const META_Y = Y;                            Y += META_H;
            const DIV_Y  = Y;                            Y += DIV_H + GAP;
            const CARD_Y = Y;                            Y += CARD_H + GAP;
            const TBL_Y  = Y;                            Y += TBL_H + GAP;
            const BOX_Y  = Y;                            Y += BOX_H + GAP;
            const FTR_Y  = PH - FTR_H;                  // pinned to bottom

            // Safety: if content stack overflows, shrink gaps (should not happen for A4)
            // With these tight constants the total is ~76+48+11+92+~110+~160+44 ≈ 541 < 842 ✓

            // ── HEADER ────────────────────────────────────────────────────────
            doc.rect(0, HDR_Y, PW, HDR_H).fill(BRAND);

            txt("VEHIQO", M, HDR_Y + 18, { size: 22, bold: true, color: WHITE });
            txt("Vehicle Rental Platform", M, HDR_Y + 46, {
                size: 8, color: WHITE, opacity: 0.72,
            });

            txt("INVOICE", M, HDR_Y + 18, {
                size: 11, bold: true, color: WHITE, align: "right", width: CW,
            });
            txt(`#${data.transactionId}`, M, HDR_Y + 36, {
                size: 7.5, color: WHITE, opacity: 0.82, align: "right", width: CW,
            });

            // Payment type pill
            const pillLabel = labelTypeMap[data.paymentType] ?? data.paymentType;
            const pillW     = pillLabel.length * 5 + 18;
            const pillX     = PW - M - pillW;
            doc.rect(pillX, HDR_Y + 52, pillW, 16).fill(BDARK);
            txt(pillLabel.toUpperCase(), pillX, HDR_Y + 56, {
                size: 7, bold: true, color: WHITE, align: "center", width: pillW,
            });

            // ── META ROW ─────────────────────────────────────────────────────
            const col3 = CW / 3;

            txt("DATE ISSUED", M, META_Y + 8, {
                size: 7, bold: true, color: GREY,
            });
            txt(fmtDate(data.paidAt), M, META_Y + 20, {
                size: 9, bold: true, color: DARK,
            });

            txt("PAYMENT METHOD", M + col3, META_Y + 8, {
                size: 7, bold: true, color: GREY,
            });
            txt(labelMethodMap[data.paymentMethod] ?? data.paymentMethod, M + col3, META_Y + 20, {
                size: 9, bold: true, color: DARK,
            });

            // Status badge
            const badgeX  = M + col3 * 2;
            const badgeW  = col3 - 4;
            const badgeBg = statusBgMap[data.paymentStatus] ?? LGREY;
            const badgeFg = statusColorMap[data.paymentStatus] ?? GREY;
            txt("STATUS", badgeX, META_Y + 8, { size: 7, bold: true, color: GREY });
            doc.rect(badgeX, META_Y + 20, badgeW, 20).fill(badgeBg);
            txt(`${data.paymentStatus}`, badgeX + 6, META_Y + 26, {
                size: 8, bold: true, color: badgeFg,
            });

            // ── BRAND DIVIDER ─────────────────────────────────────────────────
            doc.rect(M, DIV_Y, CW, 1).fill(BRAND);

            // ── INFO CARDS ────────────────────────────────────────────────────
            const halfW = CW / 2 - 6;

            // Customer card
            doc.rect(M, CARD_Y, halfW, CARD_H).fill(LGREY);
            doc.rect(M, CARD_Y, 3, CARD_H).fill(BRAND);
            txt("BILLED TO", M + 10, CARD_Y + 10, { size: 7, bold: true, color: BRAND });
            txt(data.customerName,  M + 10, CARD_Y + 24, { size: 10, bold: true, color: DARK });
            txt(data.customerEmail, M + 10, CARD_Y + 40, { size: 8.5, color: GREY });

            // Vehicle card
            const vX = M + halfW + 12;
            doc.rect(vX, CARD_Y, halfW, CARD_H).fill(LGREY);
            doc.rect(vX, CARD_Y, 3, CARD_H).fill(BRAND);
            txt("VEHICLE", vX + 10, CARD_Y + 10, { size: 7, bold: true, color: BRAND });
            txt(data.vehicleName,  vX + 10, CARD_Y + 24, { size: 10, bold: true, color: DARK });
            txt(`Plate: ${data.licensePlate}`, vX + 10, CARD_Y + 40, { size: 8, color: GREY });
            txt(
                `${fmtDate(data.startDate, true)}  to  ${fmtDate(data.endDate, true)}`,
                vX + 10, CARD_Y + 53, { size: 8, color: GREY },
            );
            txt(`${data.totalDays} day(s) rental`, vX + 10, CARD_Y + 66, { size: 8, color: GREY });

            // ── CHARGES TABLE ─────────────────────────────────────────────────
            // Column X positions
            const TC = {
                desc: M + 8,
                qty:  M + 210,
                rate: M + 320,
            };

            // Table header
            doc.rect(M, TBL_Y, CW, TBL_HDR_H).fill(BRAND);
            txt("DESCRIPTION",   TC.desc, TBL_Y + 8, { size: 8, bold: true, color: WHITE });
            txt("QTY",           TC.qty,  TBL_Y + 8, { size: 8, bold: true, color: WHITE });
            txt("RATE / DAY",    TC.rate, TBL_Y + 8, { size: 8, bold: true, color: WHITE });
            txt("AMOUNT", M, TBL_Y + 8, {
                size: 8, bold: true, color: WHITE, align: "right", width: CW - 8,
            });

            const rows: { desc: string; qty: string; rate: string; amount: string; credit?: boolean }[] = [
                {
                    desc:   "Daily Rental",
                    qty:    `${data.totalDays} days`,
                    rate:   curr(data.pricePerDay),
                    amount: curr(data.baseCost),
                },
                ...(data.extraDays > 0 ? [{
                    desc:   "Late Return (×1.2 penalty)",
                    qty:    `${data.extraDays} extra day(s)`,
                    rate:   curr(data.pricePerDay * 1.2),
                    amount: curr(data.lateFee),
                }] : []),
                ...(data.fuelCharge > 0 ? [{
                    desc: "Fuel Charge", qty: "—", rate: "—", amount: curr(data.fuelCharge),
                }] : []),
                ...(data.fuelCredit > 0 ? [{
                    desc: "Fuel Credit (refund deduction)", qty: "—", rate: "—",
                    amount: `- ${curr(data.fuelCredit)}`, credit: true,
                }] : []),
                ...(data.damageCharge > 0 ? [{
                    desc: "Damage Charge", qty: "—", rate: "—", amount: curr(data.damageCharge),
                }] : []),
            ];

            rows.forEach((row, i) => {
                const ry  = TBL_Y + TBL_HDR_H + i * ROW_H;
                const bg  = i % 2 === 0 ? WHITE : BLIGHT;
                const col = row.credit ? GREEN : DARK;
                doc.rect(M, ry, CW, ROW_H).fill(bg);
                if (i % 2 !== 0) doc.rect(M, ry, 3, ROW_H).fill(BMID);
                const ty = ry + 7;
                txt(row.desc,   TC.desc, ty, { size: 8, color: col });
                txt(row.qty,    TC.qty,  ty, { size: 8, color: GREY });
                txt(row.rate,   TC.rate, ty, { size: 8, color: GREY });
                txt(row.amount, M, ty, {
                    size: 8, bold: true, color: col, align: "right", width: CW - 8,
                });
            });

            const tblBottom = TBL_Y + TBL_HDR_H + rows.length * ROW_H;
            doc.rect(M, tblBottom, CW, 1).fill(BDR);

            // ── BOTTOM: PAYMENT BOX (left) + SUMMARY BOX (right) ─────────────
            const bHalf = CW / 2 - 6;
            const bRX   = M + bHalf + 12;  // right box X

            // ── Payment details box ──────────────────────────────────────────
            const PBH = BOX_H;  // same height as summary for alignment
            doc.rect(M, BOX_Y, bHalf, PBH).fill(LGREY);
            doc.rect(M, BOX_Y, 3, PBH).fill(BRAND);
            txt("PAYMENT DETAILS", M + 10, BOX_Y + 10, { size: 7, bold: true, color: BRAND });

            const dRows = [
                { label: "Type",           val: labelTypeMap[data.paymentType]   ?? data.paymentType,   col: DARK  },
                { label: "Method",         val: labelMethodMap[data.paymentMethod] ?? data.paymentMethod, col: DARK  },
                { label: "Status",         val: data.paymentStatus,                                       col: statusColorMap[data.paymentStatus] ?? GREY },
                { label: "Transaction ID", val: data.transactionId,                                       col: DARK  },
            ];
            dRows.forEach(({ label, val, col }, i) => {
                const ly = BOX_Y + 26 + i * 16;
                txt(label, M + 10, ly, { size: 7.5, color: GREY });
                txt(val,   M + 10, ly, { size: 7.5, bold: true, color: col, align: "right", width: bHalf - 20 });
            });

            // ── Cost summary box ─────────────────────────────────────────────
            doc.rect(bRX, BOX_Y, bHalf, BOX_H).fill(LGREY);
            doc.rect(bRX, BOX_Y, 3, BOX_H).fill(BRAND);
            txt("COST SUMMARY", bRX + 10, BOX_Y + 10, { size: 7, bold: true, color: BRAND });

            // Each summary row: label left, value right — two separate txt() calls
            const sLine = (label: string, val: string, y: number, bold = false, valCol?: string) => {
                txt(label, bRX + 10, y, { size: bold ? 9 : 8, bold, color: bold ? DARK : GREY });
                txt(val,   bRX + 10, y, {
                    size: bold ? 9 : 8, bold: true,
                    color: valCol ?? (bold ? DARK : GREY),
                    align: "right", width: bHalf - 20,
                });
            };
            const hdiv = (y: number) => doc.rect(bRX + 10, y, bHalf - 20, 0.75).fill(BDR);

            let sy = BOX_Y + 26;
            sLine("Base Cost", curr(data.baseCost), sy);
            if (data.extraDays    > 0) { sy += 16; sLine("Late Fee",      curr(data.lateFee),                  sy); }
            if (data.fuelCharge   > 0) { sy += 16; sLine("Fuel Charge",   curr(data.fuelCharge),               sy); }
            if (data.fuelCredit   > 0) { sy += 16; sLine("Fuel Credit",   `- ${curr(data.fuelCredit)}`,        sy); }
            if (data.damageCharge > 0) { sy += 16; sLine("Damage Charge", curr(data.damageCharge),             sy); }

            sy += 14; hdiv(sy);
            sy += 8;  sLine("Total Cost",   curr(data.totalCost),             sy, true);
            sy += 16; sLine("Advance Paid", `- ${curr(data.advanceAmount)}`,  sy);
            sy += 14; hdiv(sy);
            sy += 8;

            const dueColor = data.remainingDue === 0 ? GREEN : RED;
            const dueLabel = data.remainingDue === 0 ? "Fully Settled" : "Remaining Due";
            doc.rect(bRX + 3, sy - 4, bHalf - 3, 24)
                .fill(data.remainingDue === 0 ? "#dcfce7" : "#fee2e2");
            sLine(dueLabel, curr(data.remainingDue), sy + 3, true, dueColor);

            // ── FOOTER — pinned to bottom, fully centred text ─────────────────
            doc.rect(0, FTR_Y, PW, FTR_H).fill(BRAND);

            // Both lines are centred over the full page width (x=0, width=PW)
            txt("Thank you for choosing Vehiqo!", 0, FTR_Y + 10, {
                size: 8.5, bold: true, color: WHITE, align: "center", width: PW,
            });
            txt(
                `Transaction ID: ${data.transactionId}   •   Generated: ${new Date().toLocaleString("en-US")}`,
                0, FTR_Y + 26,
                { size: 7, color: WHITE, opacity: 0.72, align: "center", width: PW },
            );

            // Flush — exactly one page
            doc.flushPages();
            doc.end();

        } catch (err) {
            reject(err);
        }
    });
};