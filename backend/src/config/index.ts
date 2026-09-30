import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/anpr_city",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
