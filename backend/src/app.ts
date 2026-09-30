import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import apiRouter from "./routes";

const app: Application = express();

// Security and CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));

// Static video serving
const videosDir = fs.existsSync(path.resolve(__dirname, "../../data/videos"))
  ? path.resolve(__dirname, "../../data/videos")
  : path.resolve(process.cwd(), "data/videos");
app.use("/data/videos", express.static(videosDir));
app.use("/videos", express.static(videosDir));

// Static upload serving
const uploadsDir = fs.existsSync(path.resolve(__dirname, "../../data/uploads"))
  ? path.resolve(__dirname, "../../data/uploads")
  : path.resolve(process.cwd(), "data/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/data/uploads", express.static(uploadsDir));
app.use("/uploads", express.static(uploadsDir));

// JSON and URL-encoded body parsing with 50mb limit for frames
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// HTTP request logging
if (config.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Mount modular API routes
app.use("/api", apiRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
