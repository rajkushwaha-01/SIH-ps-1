import mongoose from "mongoose";
import { config } from "./index";

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Drop any legacy orphan index
    await conn.connection.collection("alerts").dropIndex("alertId_1").catch(() => {});
  } catch (error: any) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("[Database] MongoDB Disconnected.");
  } catch (error: any) {
    console.error(`[Database Error] Disconnection error: ${error.message}`);
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("[Database] MongoDB connection lost.");
});

mongoose.connection.on("error", (err) => {
  console.error(`[Database] Connection error: ${err.message}`);
});
