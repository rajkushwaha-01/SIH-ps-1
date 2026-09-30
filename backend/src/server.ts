import { config } from "./config";
import { connectDB } from "./config/db";
import app from "./app";

const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`Backend server running in ${config.nodeEnv} mode on port ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start server due to database error:", error);
    process.exit(1);
  }
};

startServer();

export default app;
