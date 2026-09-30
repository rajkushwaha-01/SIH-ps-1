import mongoose, { Schema, Document } from "mongoose";

export interface ICamera extends Document {
  cameraId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  direction: string;
  status: "ONLINE" | "OFFLINE";
  sourceType: "VIDEO_FILE" | "WEBCAM" | "IP_CAMERA" | "SIMULATED_VIDEO" | "RTSP_STREAM" | "STATIC_IMAGE";
  videoSource?: string;
  createdAt: Date;
}

const CameraSchema: Schema = new Schema(
  {
    cameraId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    direction: { type: String, default: "NORTH" },
    status: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: "ONLINE",
    },
    sourceType: {
      type: String,
      enum: ["VIDEO_FILE", "WEBCAM", "IP_CAMERA", "SIMULATED_VIDEO", "RTSP_STREAM", "STATIC_IMAGE"],
      default: "VIDEO_FILE",
    },
    videoSource: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

CameraSchema.index({ status: 1 });

export const Camera = mongoose.model<ICamera>("Camera", CameraSchema);
