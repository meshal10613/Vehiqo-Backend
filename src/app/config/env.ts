import dotenv from "dotenv";
import path from "path";
// import AppError from "../errorHelper/AppError";
import status from "http-status";

dotenv.config({ path: path.join(process.cwd(), ".env") });

interface EnvConfig {
    NODE_ENV: string;
    PORT: string;
    DATABASE_URL: string;
}

const loadEnvVariables = (): EnvConfig => {
    const requireEnvVariable = ["NODE_ENV", "PORT", "DATABASE_URL"];

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
    };
};

export const envVars = loadEnvVariables();