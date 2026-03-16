import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { IndexRoutes } from "./app/routes";
import { notFound } from "./app/middleware/notFound";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import "./app/cron/vehicle.cron";
import "./app/cron/booking.cron";

const app: Application = express();

//? Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

//? Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", IndexRoutes);

app.get("/", async (req: Request, res: Response) => {
    res.send("Hello World!");
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
