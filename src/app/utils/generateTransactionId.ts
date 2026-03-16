import { randomBytes } from "crypto";

export const generateTransactionId = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(3).toString("hex").toUpperCase();
    return `TXN-${timestamp}-${random}`;
};
