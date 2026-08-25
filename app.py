from flask import Flask, render_template, request, jsonify
import os
import cv2
import numpy as np
import base64

from ultralytics import YOLO


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)


# =========================================================
# YOLO MODEL
# =========================================================

# Get the directory where app.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Path to YOLO model
MODEL_PATH = os.path.join(BASE_DIR, "yolo11n.pt")

# Load YOLO model once when the application starts
model = YOLO(MODEL_PATH)


# =========================================================
# COCO CLASS IDs
# =========================================================

# COCO:
# 0  = person
# 67 = cell phone

PERSON_CLASS = 0
CELL_PHONE_CLASS = 67


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# DETECTION API
# =========================================================

@app.route("/detect", methods=["POST"])
def detect():

    try:

        # =================================================
        # RECEIVE CAMERA FRAME
        # =================================================

        file = request.files.get("frame")

        if file is None:

            return jsonify({
                "success": False,
                "message": "No camera frame received."
            }), 400


        # =================================================
        # READ IMAGE
        # =================================================

        image_bytes = file.read()

        if not image_bytes:

            return jsonify({
                "success": False,
                "message": "Empty camera frame received."
            }), 400


        # Convert bytes to NumPy array
        np_array = np.frombuffer(
            image_bytes,
            np.uint8
        )


        # Decode image
        img = cv2.imdecode(
            np_array,
            cv2.IMREAD_COLOR
        )


        if img is None:

            return jsonify({
                "success": False,
                "message": "Could not decode camera frame."
            }), 400


        # =================================================
        # YOLO DETECTION
        # =================================================

        results = model(
            img,
            verbose=False,
            conf=0.40
        )


        # =================================================
        # VARIABLES
        # =================================================

        phone_detected = False
        phone_count = 0

        # Kept for compatibility with your existing frontend.
        #
        # YOLO11n COCO does not have a face class.
        # Therefore we do NOT incorrectly treat "person"
        # as a face.
        face_count = 0


        # =================================================
        # PROCESS YOLO RESULTS
        # =================================================

        for result in results:

            if result.boxes is None:
                continue


            for box in result.boxes:

                # -----------------------------------------
                # CLASS ID
                # -----------------------------------------

                class_id = int(
                    box.cls[0].item()
                )


                # -----------------------------------------
                # CONFIDENCE
                # -----------------------------------------

                confidence = float(
                    box.conf[0].item()
                )


                # =================================================
                # CELL PHONE DETECTION
                # =================================================

                if class_id == CELL_PHONE_CLASS:

                    phone_detected = True
                    phone_count += 1


                    # -----------------------------------------
                    # GET COORDINATES
                    # -----------------------------------------

                    coordinates = (
                        box.xyxy[0]
                        .tolist()
                    )


                    x1, y1, x2, y2 = map(
                        int,
                        coordinates
                    )


                    # -----------------------------------------
                    # PHONE BOUNDING BOX
                    # -----------------------------------------

                    cv2.rectangle(
                        img,
                        (x1, y1),
                        (x2, y2),
                        (0, 0, 255),
                        3
                    )


                    # -----------------------------------------
                    # PHONE LABEL
                    # -----------------------------------------

                    label = (
                        f"PHONE "
                        f"{confidence * 100:.0f}%"
                    )


                    cv2.putText(
                        img,
                        label,
                        (
                            x1,
                            max(y1 - 10, 25)
                        ),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 0, 255),
                        2
                    )


        # =================================================
        # SAFETY STATUS
        # =================================================

        if phone_detected:

            safety_status = "WARNING"

            warning_message = (
                "Mobile phone detected!"
            )


        elif face_count > 0:

            safety_status = "SAFE"

            warning_message = (
                "Face detected. No phone detected."
            )


        else:

            safety_status = "NO FACE"

            warning_message = (
                "No face detected."
            )


        # =================================================
        # WARNING BANNER
        # =================================================

        if phone_detected:

            # Red warning banner
            cv2.rectangle(
                img,

                (0, 0),

                (
                    img.shape[1],
                    60
                ),

                (0, 0, 255),

                -1
            )


            # Warning text
            cv2.putText(
                img,

                "WARNING: PHONE DETECTED",

                (20, 40),

                cv2.FONT_HERSHEY_SIMPLEX,

                0.9,

                (255, 255, 255),

                2
            )


        # =================================================
        # ENCODE PROCESSED IMAGE
        # =================================================

        success, buffer = cv2.imencode(
            ".jpg",
            img,
            [
                cv2.IMWRITE_JPEG_QUALITY,
                80
            ]
        )


        if not success:

            return jsonify({
                "success": False,
                "message": "Could not encode processed image."
            }), 500


        # =================================================
        # CONVERT IMAGE TO BASE64
        # =================================================

        image_base64 = (
            base64
            .b64encode(buffer)
            .decode("utf-8")
        )


        # =================================================
        # API RESPONSE
        # =================================================
        #
        # IMPORTANT:
        # These field names are kept exactly the same
        # as your existing frontend API.
        #
        # =================================================

        return jsonify({

            "success": True,

            "face_count": face_count,

            "phone_detected": phone_detected,

            "phone_count": phone_count,

            "status": safety_status,

            "message": warning_message,

            "image": image_base64

        })


    # =====================================================
    # ERROR HANDLING
    # =====================================================

    except Exception as e:

        print(
            "Detection error:",
            str(e)
        )


        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health")
def health():

    return jsonify({

        "status": "ok",

        "model": "YOLO11n",

        "detector": "YOLO-only"

    })


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    # Render provides the PORT environment variable.
    # Local development will use 5000.

    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )


    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )