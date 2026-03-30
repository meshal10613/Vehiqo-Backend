import ejs from "ejs";
import nodemailer from "nodemailer";
import { envVars } from "../config/env";
import path from "path";
import AppError from "../errorHelper/AppError";
import status from "http-status";

const transporter = nodemailer.createTransport({
    host: envVars.EMAIL_SENDER.SMTP_HOST,
    secure: true,
    auth: {
        user: envVars.EMAIL_SENDER.SMTP_USER,
        pass: envVars.EMAIL_SENDER.SMTP_PASS,
    },
    port: Number(envVars.EMAIL_SENDER.SMTP_PORT),
    tls: {
        rejectUnauthorized: false, // ← add this
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    templateName: string;
    templateData: Record<string, any>;
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[];
}

export const sendEmail = async ({
    subject,
    templateData,
    templateName,
    to,
    attachments,
}: SendEmailOptions) => {
    try {
        const templatePath = path.resolve(
            process.cwd(),
            `src/app/templates/${templateName}.ejs`,
        );
        const html = await ejs.renderFile(templatePath, templateData);

        const info = await transporter.sendMail({
            from: envVars.EMAIL_SENDER.SMTP_FROM,
            to: to,
            subject: subject,
            html: html,
            attachments: attachments?.map((attachment) => ({
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType,
            })),
        });

        console.log(`Email sent to ${to} : ${info.messageId}`);
    } catch (error: any) {
        console.log("Email Sending Error: ", error);
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            "Failed to send email",
        );
    }
};

// import ejs from "ejs";
// import { Resend } from "resend";
// import { envVars } from "../config/env";
// import path from "path";
// import AppError from "../errorHelper/AppError";
// import status from "http-status";

// const resend = new Resend(envVars.EMAIL_SENDER.RESEND_API_KEY);

// interface SendEmailOptions {
//     to: string;
//     subject: string;
//     templateName: string;
//     templateData: Record<string, any>;
//     attachments?: {
//         filename: string;
//         content: Buffer | string;
//         contentType: string;
//     }[];
// }

// export const sendEmail = async ({
//     subject,
//     templateData,
//     templateName,
//     to,
//     attachments,
// }: SendEmailOptions) => {
//     try {
//         const templatePath = path.resolve(
//             process.cwd(),
//             `src/app/templates/${templateName}.ejs`,
//         );
//         const html = await ejs.renderFile(templatePath, templateData);

//         const { error } = await resend.emails.send({
//             from: envVars.EMAIL_SENDER.SMTP_FROM, // must be a verified domain in Resend
//             to,
//             subject,
//             html: html as string,
//             attachments: attachments?.map((attachment) => ({
//                 filename: attachment.filename,
//                 content: attachment.content,
//                 contentType: attachment.contentType,
//             })),
//         });

//         if (error) {
//             console.error("Resend error:", error);
//             throw new Error(error.message);
//         }

//         console.log(`Email sent to ${to}`);
//     } catch (error: any) {
//         console.log("Email Sending Error: ", error);
//         throw new AppError(
//             status.INTERNAL_SERVER_ERROR,
//             "Failed to send email",
//         );
//     }
// };
