"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Security and CORS
app.use((0, cors_1.default)({
    origin: config_1.config.frontendUrl,
    credentials: true
}));
// Static video serving
const videosDir = fs_1.default.existsSync(path_1.default.resolve(__dirname, "../../data/videos"))
    ? path_1.default.resolve(__dirname, "../../data/videos")
    : path_1.default.resolve(process.cwd(), "data/videos");
app.use("/data/videos", express_1.default.static(videosDir));
app.use("/videos", express_1.default.static(videosDir));
// Static upload serving
const uploadsDir = fs_1.default.existsSync(path_1.default.resolve(__dirname, "../../data/uploads"))
    ? path_1.default.resolve(__dirname, "../../data/uploads")
    : path_1.default.resolve(process.cwd(), "data/uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/data/uploads", express_1.default.static(uploadsDir));
app.use("/uploads", express_1.default.static(uploadsDir));
// JSON and URL-encoded body parsing with 50mb limit for frames
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// HTTP request logging
if (config_1.config.nodeEnv !== "test") {
    app.use((0, morgan_1.default)("dev"));
}
// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
// Mount modular API routes
app.use("/api", routes_1.default);
// Centralized error handling
app.use(errorHandler_1.errorHandler);
exports.default = app;
