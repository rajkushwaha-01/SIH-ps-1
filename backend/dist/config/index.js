"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || "5000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",
    mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/anpr_city",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
