import mongoose, { Schema, Document } from "mongoose";

export interface IVehicle extends Document {
  plate: string;
  firstSeen: Date;
  lastSeen: Date;
  totalDetections: number;
  lastCameraId: string;
}

const VehicleSchema: Schema = new Schema(
  {
    plate: { type: String, required: true, unique: true, index: true },
    firstSeen: { type: Date, required: true },
    lastSeen: { type: Date, required: true },
    totalDetections: { type: Number, default: 1 },
    lastCameraId: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

VehicleSchema.index({ lastSeen: -1 });

export const Vehicle = mongoose.model<IVehicle>("Vehicle", VehicleSchema);
