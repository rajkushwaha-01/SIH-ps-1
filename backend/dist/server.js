"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const db_1 = require("./config/db");
const app_1 = __importDefault(require("./app"));
const startServer = async () => {
    try {
        await (0, db_1.connectDB)();
        app_1.default.listen(config_1.config.port, () => {
            console.log(`Backend server running in ${config_1.config.nodeEnv} mode on port ${config_1.config.port}`);
        });
    }
    catch (error) {
        console.error("Failed to start server due to database error:", error);
        process.exit(1);
    }
};
startServer();
exports.default = app_1.default;
