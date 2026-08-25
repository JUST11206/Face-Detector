from flask import Flask, render_template, request, jsonify

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

model = YOLO("yolo11n.pt")


# =========================================================
# COCO CLASS ID
# 67 = cell phone
# =========================================================

CELL_PHONE_CLASS = 67


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================================
# DETECTION API
# =========================================================

@app.route(
    "/detect",
    methods=["POST"]
)
def detect():

    try:

        # -------------------------------------------------
        # RECEIVE FRAME
        # -------------------------------------------------

        file = request.files.get(
            "frame"
        )

        if file is None:

            return jsonify({

                "success": False,

                "message":
                    "No camera frame received."

            }), 400


        # -------------------------------------------------
        # READ IMAGE
        # -------------------------------------------------

        image_bytes = file.read()

        np_array = np.frombuffer(
            image_bytes,
            np.uint8
        )

        img = cv2.imdecode(
            np_array,
            cv2.IMREAD_COLOR
        )


        if img is None:

            return jsonify({

                "success": False,

                "message":
                    "Could not decode camera frame."

            }), 400


        # =================================================
        # FACE COUNT
        # =================================================
        #
        # CVZone / MediaPipe removed because Render was
        # failing due to libGLESv2.so.2.
        #
        # Keeping this field in the API so your existing
        # frontend does not break.
        # =================================================

        face_count = 0


        # =================================================
        # PHONE DETECTION
        # =================================================

        results = model(
            img,
            verbose=False,
            conf=0.40
        )


        phone_detected = False
        phone_count = 0


        # -------------------------------------------------
        # PROCESS YOLO RESULTS
        # -------------------------------------------------

        for result in results:

            if result.boxes is None:
                continue


            for box in result.boxes:

                class_id = int(
                    box.cls[0].item()
                )

                confidence = float(
                    box.conf[0].item()
                )


                # -----------------------------------------
                # CELL PHONE
                # -----------------------------------------

                if class_id == CELL_PHONE_CLASS:

                    phone_detected = True

                    phone_count += 1


                    coordinates = (
                        box.xyxy[0]
                        .tolist()
                    )


                    x1, y1, x2, y2 = map(
                        int,
                        coordinates
                    )


                    # -------------------------------------
                    # PHONE BOX
                    # -------------------------------------

                    cv2.rectangle(
                        img,

                        (x1, y1),

                        (x2, y2),

                        (0, 0, 255),

                        3
                    )


                    # -------------------------------------
                    # LABEL
                    # -------------------------------------

                    label = (
                        f"PHONE "
                        f"{confidence * 100:.0f}%"
                    )


                    cv2.putText(
                        img,

                        label,

                        (
                            x1,
                            max(
                                y1 - 10,
                                25
                            )
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

            cv2.rectangle(
                img,

                (
                    0,
                    0
                ),

                (
                    img.shape[1],
                    60
                ),

                (0, 0, 255),

                -1
            )


            cv2.putText(
                img,

                "WARNING: PHONE DETECTED",

                (
                    20,
                    40
                ),

                cv2.FONT_HERSHEY_SIMPLEX,

                0.9,

                (255, 255, 255),

                2
            )


        # =================================================
        # ENCODE IMAGE
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

                "message":
                    "Could not encode processed image."

            }), 500


        # =================================================
        # BASE64
        # =================================================

        image_base64 = (
            base64
            .b64encode(buffer)
            .decode("utf-8")
        )


        # =================================================
        # RESPONSE
        # =================================================

        return jsonify({

            "success": True,

            "face_count":
                face_count,

            "phone_detected":
                phone_detected,

            "phone_count":
                phone_count,

            "status":
                safety_status,

            "message":
                warning_message,

            "image":
                image_base64

        })


    except Exception as e:

        print(
            "Detection error:",
            e
        )


        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )