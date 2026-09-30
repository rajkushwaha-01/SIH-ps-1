import mongoose, { Schema, Document } from "mongoose";

export interface IDetection extends Document {
  plate: string;
  confidence: number;
  trackId: number;
  cameraId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  direction?: string;
  vehicleType?: string;
  imagePath?: string;
  sourceType: "UPLOAD_IMAGE" | "UPLOAD_VIDEO" | "WEBCAM" | "VIDEO_FILE" | "IP_CAMERA";
}

const DetectionSchema: Schema = new Schema(
  {
    plate: { type: String, required: true, index: true },
    confidence: { type: Number, required: true },
    trackId: { type: Number, required: true },
    cameraId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    direction: { type: String, default: "UNKNOWN" },
    vehicleType: { type: String, default: "CAR" },
    imagePath: { type: String },
    sourceType: {
      type: String,
      enum: ["UPLOAD_IMAGE", "UPLOAD_VIDEO", "WEBCAM", "VIDEO_FILE", "IP_CAMERA"],
      default: "VIDEO_FILE",
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

DetectionSchema.index({ plate: 1, timestamp: 1 });
DetectionSchema.index({ cameraId: 1, timestamp: -1 });

export const Detection = mongoose.model<IDetection>("Detection", DetectionSchema);
