import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import cv2
import numpy as np

os.makedirs("data/demo", exist_ok=True)
os.makedirs("data/videos", exist_ok=True)

def render_vehicle_plate_frame(plate_text: str, x_offset: int, y_offset: int, width: int = 1280, height: int = 720) -> np.ndarray:
    frame = np.full((height, width, 3), (60, 60, 65), dtype=np.uint8)
    
    cv2.line(frame, (width // 2, 0), (width // 2, height), (220, 220, 220), 4)
    cv2.line(frame, (100, 0), (50, height), (240, 240, 240), 6)
    cv2.line(frame, (width - 100, 0), (width - 50, height), (240, 240, 240), 6)

    car_w, car_h = 360, 240
    car_x1 = x_offset
    car_y1 = y_offset
    car_x2 = car_x1 + car_w
    car_y2 = car_y1 + car_h

    cv2.ellipse(frame, (car_x1 + car_w // 2, car_y2 + 10), (car_w // 2 + 30, 25), 0, 0, 360, (25, 25, 25), -1)
    cv2.rectangle(frame, (car_x1, car_y1), (car_x2, car_y2), (90, 45, 30), -1)
    cv2.rectangle(frame, (car_x1 + 30, car_y1 + 20), (car_x2 - 30, car_y1 + 90), (35, 35, 40), -1)
    cv2.rectangle(frame, (car_x1 + 10, car_y1 + 100), (car_x1 + 55, car_y1 + 130), (20, 20, 200), -1)
    cv2.rectangle(frame, (car_x2 - 55, car_y1 + 100), (car_x2 - 10, car_y1 + 130), (20, 20, 200), -1)
    cv2.rectangle(frame, (car_x1 + 15, car_y1 + 140), (car_x2 - 15, car_y2 - 10), (45, 45, 50), -1)

    plate_w, plate_h = 170, 52
    plate_x1 = car_x1 + (car_w - plate_w) // 2
    plate_y1 = car_y1 + 155
    plate_x2 = plate_x1 + plate_w
    plate_y2 = plate_y1 + plate_h

    cv2.rectangle(frame, (plate_x1 - 2, plate_y1 - 2), (plate_x2 + 2, plate_y2 + 2), (10, 10, 10), -1)
    cv2.rectangle(frame, (plate_x1, plate_y1), (plate_x2, plate_y2), (245, 245, 245), -1)
    cv2.rectangle(frame, (plate_x1 + 3, plate_y1 + 3), (plate_x2 - 3, plate_y2 - 3), (15, 15, 15), 1)

    cv2.rectangle(frame, (plate_x1, plate_y1), (plate_x1 + 18, plate_y2), (180, 50, 20), -1)
    cv2.putText(frame, "IND", (plate_x1 + 1, plate_y1 + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.28, (255, 255, 255), 1)

    cv2.putText(
        frame,
        plate_text,
        (plate_x1 + 24, plate_y1 + 36),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.82,
        (10, 10, 10),
        2,
        cv2.LINE_AA
    )

    return frame

def generate_video(filename: str, plate: str, trajectory_type: int = 1):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(filename, fourcc, 15, (1280, 720))

    for i in range(25):
        if trajectory_type == 1:
            x = int(380 + i * 9)
            y = int(220 + i * 6)
        elif trajectory_type == 2:
            x = int(500 - i * 6)
            y = int(200 + i * 8)
        else:
            x = int(420 + i * 5)
            y = int(250 + i * 7)

        frame = render_vehicle_plate_frame(plate, x_offset=x, y_offset=y)
        out.write(frame)

    out.release()
    print(f"[OK] Generated {filename}")

def create_all_media():
    plate = "MP04AB1234"
    img = render_vehicle_plate_frame(plate, x_offset=460, y_offset=280)
    cv2.imwrite("data/demo/test_car_plate.jpg", img)

    generate_video("data/videos/cam_001.mp4", plate, 1)
    generate_video("data/videos/cam_002.mp4", plate, 2)
    generate_video("data/videos/cam_003.mp4", plate, 3)

if __name__ == "__main__":
    create_all_media()
