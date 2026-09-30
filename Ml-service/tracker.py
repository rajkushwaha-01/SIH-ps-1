import numpy as np

class PlateTracker:
    def __init__(self, detector):
        self.detector = detector

    def track_frame(self, frame: np.ndarray, conf: float = 0.35) -> list[dict]:
        """
        Executes YOLO inference with ByteTrack persistent multi-object tracking.
        Returns list of detections with unique tracking IDs.
        """
        results = self.detector.model.track(
            source=frame,
            conf=conf,
            persist=True,
            tracker="bytetrack.yaml",
            verbose=False
        )

        tracks = []
        if not results:
            return tracks

        r = results[0]
        if r.boxes is not None and len(r.boxes) > 0:
            boxes = r.boxes.xyxy.cpu().numpy()
            scores = r.boxes.conf.cpu().numpy() if r.boxes.conf is not None else [1.0] * len(boxes)
            track_ids = (
                r.boxes.id.int().cpu().tolist()
                if r.boxes.id is not None
                else [None] * len(boxes)
            )

            for box, score, track_id in zip(boxes, scores, track_ids):
                x1, y1, x2, y2 = map(int, box)
                tracks.append({
                    "track_id": track_id,
                    "bbox": [x1, y1, x2, y2],
                    "confidence": float(score)
                })

        return tracks
