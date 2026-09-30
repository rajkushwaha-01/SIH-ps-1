import os
import torch
import numpy as np
from ultralytics import YOLO

class PlateDetector:
    def __init__(self, model_path: str):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Trained model checkpoint not found at: {model_path}")

        print(f"[Detector] Loading YOLO model from {model_path}...")
        self.model = YOLO(model_path)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cuda":
            self.model.to("cuda")
            self.model.fuse()
        print(f"[Detector] Model loaded on device '{self.device}'. Classes: {self.model.names}")

    def detect(self, image: np.ndarray, conf: float = 0.25) -> list[dict]:
        """
        Runs YOLO license plate detection on a frame or image.
        Returns list of detected bounding boxes with coordinates and confidence.
        """
        results = self.model.predict(source=image, conf=conf, verbose=False)
        detections = []

        if not results:
            return detections

        r = results[0]
        if r.boxes is not None and len(r.boxes) > 0:
            boxes = r.boxes.xyxy.cpu().numpy()
            scores = r.boxes.conf.cpu().numpy() if r.boxes.conf is not None else [1.0] * len(boxes)

            for box, score in zip(boxes, scores):
                x1, y1, x2, y2 = map(int, box)
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": float(score)
                })

        return detections
