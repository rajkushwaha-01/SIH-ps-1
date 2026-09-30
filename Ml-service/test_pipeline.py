import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import json
from pipeline import ANPRPipeline

def run_test():
    print("=== Testing Python ANPR Pipeline ===")
    model_path = os.path.abspath("../models/custom_trained_model.pt")
    if not os.path.exists(model_path):
        model_path = os.path.abspath("models/custom_trained_model.pt")

    print(f"Loading pipeline with model: {model_path}")
    pipeline = ANPRPipeline(model_path)

    # 1. Test Image Inference
    test_image_path = os.path.abspath("../data/demo/test_car_plate.jpg")
    print(f"\n1. Testing Image ANPR on: {test_image_path}")
    img_res = pipeline.process_image(test_image_path)
    print("Image Result:")
    print(json.dumps(img_res, indent=2))

    assert "success" in img_res and img_res["success"] is True, "Image processing failed"
    assert "detections" in img_res, "Missing detections in image response"

    # 2. Test Video Inference with Tracking & Sharpness Gating
    test_video_path = os.path.abspath("../data/videos/cam_001.mp4")
    print(f"\n2. Testing Video ANPR & Tracking on: {test_video_path}")
    vid_res = pipeline.process_video(test_video_path, frame_skip=1)
    print("Video Result:")
    print(json.dumps(vid_res, indent=2))

    assert "success" in vid_res and vid_res["success"] is True, "Video processing failed"
    assert "detections" in vid_res, "Missing detections in video response"

    print("\n=== PIPELINE INFERENCE TEST COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_test()
