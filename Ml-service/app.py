import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import tempfile
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from pipeline import ANPRPipeline

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("PORT", 8000))
MODEL_PATH = os.getenv("MODEL_PATH", "../models/custom_trained_model.pt")

# Resolve relative path if necessary
if not os.path.isabs(MODEL_PATH):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    resolved_model_path = os.path.normpath(os.path.join(base_dir, MODEL_PATH))
    if not os.path.exists(resolved_model_path) and os.path.exists(MODEL_PATH):
        resolved_model_path = os.path.abspath(MODEL_PATH)
else:
    resolved_model_path = MODEL_PATH

pipeline: ANPRPipeline | None = None

def get_pipeline() -> ANPRPipeline:
    global pipeline
    if pipeline is None:
        if not os.path.exists(resolved_model_path):
            raise FileNotFoundError(f"Model file not found at {resolved_model_path}")
        print(f"[ML App] Initializing ANPRPipeline with model: {resolved_model_path}")
        pipeline = ANPRPipeline(resolved_model_path)
    return pipeline

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "ml-service",
        "model_configured": os.path.exists(resolved_model_path),
        "model_path": resolved_model_path
    }), 200

@app.route("/process/image", methods=["POST"])
def process_image_endpoint():
    try:
        pipe = get_pipeline()

        # Handle image file upload
        if "file" in request.files:
            file = request.files["file"]
            file_bytes = np.frombuffer(file.read(), np.uint8)
            image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
            if image is None:
                return jsonify({"success": False, "error": "Invalid image format", "detections": []}), 400
            result = pipe.process_image(image)
            return jsonify(result), 200

        # Handle JSON with imagePath
        data = request.get_json(silent=True) or {}
        image_path = data.get("imagePath")
        if image_path:
            if not os.path.exists(image_path):
                return jsonify({"success": False, "error": f"Image file not found: {image_path}", "detections": []}), 404
            result = pipe.process_image(image_path)
            return jsonify(result), 200

        return jsonify({"success": False, "error": "No file or imagePath provided", "detections": []}), 400

    except Exception as e:
        print(f"[Error in /process/image] {str(e)}")
        return jsonify({"success": False, "error": str(e), "detections": []}), 500

@app.route("/process/video", methods=["POST"])
def process_video_endpoint():
    temp_path = None
    try:
        pipe = get_pipeline()
        video_path = None

        # Handle uploaded video file
        if "file" in request.files:
            file = request.files["file"]
            suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                file.save(tmp.name)
                temp_path = tmp.name
                video_path = temp_path
        else:
            data = request.get_json(silent=True) or {}
            video_path = data.get("videoPath")

        if not video_path:
            return jsonify({"success": False, "error": "No video file or videoPath provided", "detections": []}), 400

        if not os.path.exists(video_path):
            return jsonify({"success": False, "error": f"Video file not found: {video_path}", "detections": []}), 404

        frame_skip = int(request.args.get("frame_skip", 1))
        result = pipe.process_video(video_path, frame_skip=frame_skip)
        return jsonify(result), 200

    except Exception as e:
        print(f"[Error in /process/video] {str(e)}")
        return jsonify({"success": False, "error": str(e), "detections": []}), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

if __name__ == "__main__":
    print(f"ML Service starting on port {PORT} with model {resolved_model_path}...")
    # Pre-initialize model on startup
    get_pipeline()
    app.run(host="0.0.0.0", port=PORT, debug=False)
