import cv2
import numpy as np
from fast_plate_ocr import LicensePlateRecognizer
from plate_processor import normalize_plate

class PlateOCR:
    def __init__(self, model_name: str = "cct-xs-v2-global-model"):
        print(f"[OCR] Loading Fast-Plate-OCR model '{model_name}'...")
        self.recognizer = LicensePlateRecognizer(model_name)
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        self._warmup()

    def _warmup(self):
        """Warms up the OCR model with a dummy crop to eliminate cold-start latency."""
        dummy = np.zeros((64, 128, 3), dtype=np.uint8)
        for _ in range(2):
            self.recognizer.run(dummy)
        print("[OCR] OCR Engine initialized and warmed up.")

    @staticmethod
    def calculate_sharpness(crop: np.ndarray) -> float:
        """
        Calculates normalized focus metric using Laplacian variance
        after resizing to 128x64 to remain invariant to image scale.
        """
        if crop is None or crop.size == 0:
            return 0.0
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        norm_crop = cv2.resize(gray, (128, 64), interpolation=cv2.INTER_AREA)
        return float(cv2.Laplacian(norm_crop, cv2.CV_64F).var())

    def preprocess_crop(self, crop: np.ndarray) -> np.ndarray:
        """Applies CLAHE contrast enhancement and cubic enlargement for optimal character OCR."""
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        enhanced = self.clahe.apply(gray)
        enhanced = cv2.resize(enhanced, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

    def recognize(self, crop: np.ndarray) -> tuple[str, float]:
        """
        Runs OCR on plate crop.
        Returns:
            (normalized_plate_text, confidence_score)
        """
        if crop is None or crop.size == 0:
            return "", 0.0

        processed = self.preprocess_crop(crop)
        predictions = self.recognizer.run(processed, return_confidence=True)
        if not predictions:
            return "", 0.0

        pred = predictions[0]
        raw_text = pred.plate if hasattr(pred, "plate") else str(pred)
        
        # Calculate confidence from character probabilities or prediction score
        if hasattr(pred, "char_probs") and pred.char_probs is not None:
            confidence = float(np.mean(pred.char_probs))
        elif hasattr(pred, "confidence"):
            confidence = float(pred.confidence)
        else:
            confidence = 0.85

        normalized = normalize_plate(raw_text)
        return normalized, round(confidence, 4)
