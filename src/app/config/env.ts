import dotenv from "dotenv";
import path from "path";
// import AppError from "../errorHelper/AppError";
import status from "http-status";

dotenv.config({ path: path.join(process.cwd(), ".env") });

interface EnvConfig {
    NODE_ENV: string;
    PORT: string;
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    APP_URL: string;
    FRONTEND_URL: string;
}

const loadEnvVariables = (): EnvConfig => {
    const requireEnvVariable = [
        "NODE_ENV",
        "PORT",
        "DATABASE_URL",
        "BETTER_AUTH_SECRET",
        "BETTER_AUTH_URL",
        "APP_URL",
        "FRONTEND_URL",
    ];

    requireEnvVariable.forEach((variable) => {
        if (!process.env[variable]) {
            // throw new AppError(
            //     status.INTERNAL_SERVER_ERROR,
            //     `Environment variable ${variable} is required but not set in .env file.`,
            // );
            throw new Error(
                `Environment variable ${variable} is required but not set in .env file.`,
            );
        }
    });

    return {
        NODE_ENV: process.env.NODE_ENV as string,
        PORT: process.env.PORT as string,
        DATABASE_URL: process.env.DATABASE_URL as string,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET as string,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL as string,
        APP_URL: process.env.APP_URL as string,
        FRONTEND_URL: process.env.FRONTEND_URL as string,
    };
};

export const envVars = loadEnvVariables();
