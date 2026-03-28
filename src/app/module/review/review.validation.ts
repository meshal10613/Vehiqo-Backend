import { z } from "zod";

export const createReviewSchema = z
    .object({
        rating: z
            .number({
                message: "Rating must be a number",
            })
            .int({ message: "Rating must be an integer" })
            .min(1, { message: "Rating must be at least 1" })
            .max(5, { message: "Rating must not exceed 5" }),

        comment: z
            .string({ message: "Comment must be a string" })
            .min(5, { message: "Comment must be at least 5 characters" })
            .max(500, { message: "Comment must not exceed 500 characters" })
            .trim(),

        bookingId: z
            .string({ message: "Vehicle ID must be a string" })
            .uuid({ message: "Vehicle ID must be a valid UUID" }),
    })
    .strict();

export const updateReviewSchema = z
    .object({
        rating: z
            .number({ message: "Rating must be a number" })
            .int({ message: "Rating must be an integer" })
            .min(1, { message: "Rating must be at least 1" })
            .max(5, { message: "Rating must not exceed 5" })
            .optional(),

        comment: z
            .string({ message: "Comment must be a string" })
            .min(5, { message: "Comment must be at least 5 characters" })
            .max(500, { message: "Comment must not exceed 500 characters" })
            .trim()
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    })
    .strict();

export type ICreateReviewPayload = z.infer<typeof createReviewSchema>;
export type IUpdateReviewPayload = z.infer<typeof updateReviewSchema>;
