import mongoose, { Schema, Document } from "mongoose";

export interface IAlert extends Document {
  plate: string;
  type: "BLACKLIST_MATCH" | "ROUTE_ANOMALY" | "SPEED_VIOLATION";
  cameraId: string;
  timestamp: Date;
  description: string;
  status: "ACTIVE" | "RESOLVED";
  createdAt: Date;
}

const AlertSchema: Schema = new Schema(
  {
    plate: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["BLACKLIST_MATCH", "ROUTE_ANOMALY", "SPEED_VIOLATION"],
      default: "BLACKLIST_MATCH",
    },
    cameraId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["ACTIVE", "RESOLVED"],
      default: "ACTIVE",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AlertSchema.index({ status: 1, timestamp: -1 });

export const Alert = mongoose.model<IAlert>("Alert", AlertSchema);
