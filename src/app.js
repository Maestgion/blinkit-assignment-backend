import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

const app = express();

// middlewares
app.use(helmet());
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(urlencoded({ extended: true, limit: "16kb" }));

// public assets
app.use(express.static('public'))

// routes import
import userRouter from "./router/user.routes.js"

// routes declarations
app.use("/api/v1/users", userRouter)

export default app;
