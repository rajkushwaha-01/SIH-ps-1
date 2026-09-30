import collections
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import cv2
import numpy as np
from detector import PlateDetector
from tracker import PlateTracker
from ocr import PlateOCR

class ANPRPipeline:
    def __init__(self, model_path: str):
        self.detector = PlateDetector(model_path)
        self.tracker = PlateTracker(self.detector)
        self.ocr = PlateOCR()
        self.padding = 6
        self.min_sharpness_floor = 45.0
        self.sharpness_margin = 1.15
        self.max_scans = 5

    def process_image(self, image_input) -> dict:
        """
        Processes a single image file or numpy array.
        Returns structured detection output.
        """
        if isinstance(image_input, str):
            image = cv2.imread(image_input)
            if image is None:
                return {"success": False, "error": f"Failed to load image from {image_input}", "detections": []}
        else:
            image = image_input

        h, w = image.shape[:2]
        boxes = self.detector.detect(image, conf=0.25)
        detections = []

        for idx, det in enumerate(boxes):
            x1, y1, x2, y2 = det["bbox"]
            x1_p = max(0, x1 - self.padding)
            y1_p = max(0, y1 - self.padding)
            x2_p = min(w, x2 + self.padding)
            y2_p = min(h, y2 + self.padding)

            if y2_p <= y1_p or x2_p <= x1_p:
                continue

            crop = image[y1_p:y2_p, x1_p:x2_p]
            plate_text, ocr_conf = self.ocr.recognize(crop)

            if plate_text and len(plate_text) >= 4:
                # Weighted confidence combining detector and OCR
                combined_conf = round(det["confidence"] * 0.4 + ocr_conf * 0.6, 4)
                detections.append({
                    "plate": plate_text,
                    "confidence": combined_conf,
                    "trackId": idx + 1,
                    "bbox": [x1, y1, x2, y2]
                })

        return {
            "success": True,
            "detections": detections
        }

    def process_video(
        self,
        video_source: str,
        frame_skip: int = 1,
        min_sharpness: float = 45.0
    ) -> dict:
        """
        Processes a video file with ByteTrack and Peak-Sharpness Gated OCR.
        Returns deduplicated detections per vehicle track ID.
        """
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            return {
                "success": False,
                "error": f"Failed to open video source: {video_source}",
                "detections": []
            }

        tracked_plates = {}
        frame_count = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            if frame_count % frame_skip != 0 and frame_count != 1:
                continue

            h, w = frame.shape[:2]
            tracks = self.tracker.track_frame(frame, conf=0.35)

            for tr in tracks:
                track_id = tr["track_id"]
                if track_id is None:
                    continue

                if track_id not in tracked_plates:
                    tracked_plates[track_id] = {
                        "history": [],
                        "confidences": [],
                        "final": None,
                        "best_sharpness": 0.0,
                    }

                p_data = tracked_plates[track_id]
                if p_data["final"] is not None:
                    continue

                x1, y1, x2, y2 = tr["bbox"]
                x1_p = max(0, x1 - self.padding)
                y1_p = max(0, y1 - self.padding)
                x2_p = min(w, x2 + self.padding)
                y2_p = min(h, y2 + self.padding)

                if y2_p <= y1_p or x2_p <= x1_p:
                    continue

                crop = frame[y1_p:y2_p, x1_p:x2_p]
                sharpness = self.ocr.calculate_sharpness(crop)

                is_first = (p_data["best_sharpness"] == 0.0 and sharpness >= min_sharpness)
                is_better = (sharpness >= p_data["best_sharpness"] * self.sharpness_margin)

                if is_first or is_better:
                    plate_text, ocr_conf = self.ocr.recognize(crop)
                    if plate_text and len(plate_text) >= 4:
                        p_data["history"].append(plate_text)
                        p_data["confidences"].append(ocr_conf)
                        p_data["best_sharpness"] = sharpness

                        if len(p_data["history"]) >= self.max_scans:
                            # Lock with majority vote
                            most_common = collections.Counter(p_data["history"]).most_common(1)[0][0]
                            p_data["final"] = most_common

        cap.release()

        # Build final structured output
        final_detections = []
        for track_id, data in tracked_plates.items():
            resolved_plate = data["final"]
            if not resolved_plate and data["history"]:
                resolved_plate = collections.Counter(data["history"]).most_common(1)[0][0]

            if resolved_plate:
                avg_conf = (
                    round(float(np.mean(data["confidences"])), 4)
                    if data["confidences"]
                    else 0.88
                )
                final_detections.append({
                    "plate": resolved_plate,
                    "confidence": avg_conf,
                    "trackId": int(track_id)
                })

        return {
            "success": True,
            "detections": final_detections
        }
