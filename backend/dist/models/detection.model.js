"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Detection = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DetectionSchema = new mongoose_1.Schema({
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
}, {
    timestamps: false,
    versionKey: false,
});
DetectionSchema.index({ plate: 1, timestamp: 1 });
DetectionSchema.index({ cameraId: 1, timestamp: -1 });
exports.Detection = mongoose_1.default.model("Detection", DetectionSchema);
