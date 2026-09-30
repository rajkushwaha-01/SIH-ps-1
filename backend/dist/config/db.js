"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const index_1 = require("./index");
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(index_1.config.mongodbUri, {
            serverSelectionTimeoutMS: 8000,
        });
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
        // Drop any legacy orphan index
        await conn.connection.collection("alerts").dropIndex("alertId_1").catch(() => { });
    }
    catch (error) {
        console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
        throw error;
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await mongoose_1.default.disconnect();
        console.log("[Database] MongoDB Disconnected.");
    }
    catch (error) {
        console.error(`[Database Error] Disconnection error: ${error.message}`);
    }
};
exports.disconnectDB = disconnectDB;
mongoose_1.default.connection.on("disconnected", () => {
    console.log("[Database] MongoDB connection lost.");
});
mongoose_1.default.connection.on("error", (err) => {
    console.error(`[Database] Connection error: ${err.message}`);
});
