import { z } from "zod";

const registerUserSchema = z.object({
    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name is too long")
        .trim(),
    email: z.string().email("Invalid email address").trim(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password is too long"),
}).strict();

const loginUserSchema = z.object({
    email: z.string().email("Invalid email address").trim(),
    password: z.string().min(1, "Password is required"),
}).strict();

export const authValidation = { registerUserSchema, loginUserSchema };