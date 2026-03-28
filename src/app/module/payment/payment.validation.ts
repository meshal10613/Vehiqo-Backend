import z from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Create advance payment session
// ─────────────────────────────────────────────────────────────────────────────
// bookingId comes from req.params, not req.body, but we validate it here so
// the controller can call .parse(req.params) and get a typed, validated value
// rather than trusting a raw string from the URL.

export const createSessionSchema = z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Create remaining-due payment session  (called after vehicle return)
// ─────────────────────────────────────────────────────────────────────────────

export const createRemainingSessionSchema = z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
});

export type ICreateSessionParams = z.infer<typeof createSessionSchema>;
export type ICreateRemainingParams = z.infer<
    typeof createRemainingSessionSchema
>;
