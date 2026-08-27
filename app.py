from flask import Flask, render_template, request, jsonify
import os
import cv2
import numpy as np
import base64
from ultralytics import YOLO
import logging

# =========================================================
# LOGGING
# =========================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =========================================================
# FLASK APP
# =========================================================
app = Flask(__name__)

# =========================================================
# YOLO MODEL INITIALIZATION
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "yolo11n.pt")

# Auto-download model if not present
try:
    if not os.path.exists(MODEL_PATH):
        logger.info("Downloading YOLO11n model...")
        model = YOLO("yolo11n.pt")  # Auto-downloads to cache
        model.save(MODEL_PATH)
    else:
        model = YOLO(MODEL_PATH)
    logger.info("✓ YOLO model loaded successfully")
except Exception as e:
    logger.error(f"Model loading error: {e}")
    model = None

# =========================================================
# COCO CLASSES
# =========================================================
PERSON_CLASS = 0
CELL_PHONE_CLASS = 67

# =========================================================
# ROUTES
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/health")
def health():
    model_status = "loaded" if model else "failed"
    return jsonify({
        "status": "ok",
        "model": "YOLO11n",
        "detector": "YOLO-only",
        "model_status": model_status
    })

@app.route("/detect", methods=["POST"])
def detect():
    """
    Receive camera frame, detect phones, return annotated image
    """
    try:
        # =====================================================
        # RECEIVE AND VALIDATE FRAME
        # =====================================================
        
        if model is None:
            return jsonify({
                "success": False,
                "message": "YOLO model not loaded"
            }), 500

        file = request.files.get("frame")
        if not file:
            return jsonify({
                "success": False,
                "message": "No frame received"
            }), 400

        image_bytes = file.read()
        if not image_bytes:
            return jsonify({
                "success": False,
                "message": "Empty frame"
            }), 400

        # =====================================================
        # DECODE IMAGE
        # =====================================================
        
        np_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({
                "success": False,
                "message": "Could not decode frame"
            }), 400

        original_img = img.copy()

        # =====================================================
        # YOLO DETECTION
        # =====================================================
        
        # Lower confidence threshold for better detection
        results = model(img, verbose=False, conf=0.35, iou=0.45)

        # =====================================================
        # PROCESS RESULTS
        # =====================================================
        
        phone_detected = False
        phone_count = 0
        person_count = 0
        detections = []

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                coordinates = box.xyxy[0].tolist()
                x1, y1, x2, y2 = map(int, coordinates)

                # =====================================================
                # PERSON DETECTION
                # =====================================================
                
                if class_id == PERSON_CLASS:
                    person_count += 1
                    
                    # Draw person bounding box (light blue)
                    cv2.rectangle(img, (x1, y1), (x2, y2), (255, 200, 0), 2)
                    label = f"PERSON {confidence * 100:.0f}%"
                    cv2.putText(
                        img, label,
                        (x1, max(y1 - 10, 25)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6, (255, 200, 0), 2
                    )

                # =====================================================
                # PHONE DETECTION
                # =====================================================
                
                elif class_id == CELL_PHONE_CLASS:
                    phone_detected = True
                    phone_count += 1
                    detections.append({
                        "type": "phone",
                        "coords": (x1, y1, x2, y2),
                        "confidence": confidence
                    })
                    
                    # Draw phone bounding box (RED - DANGER)
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 3)
                    label = f"PHONE {confidence * 100:.0f}%"
                    cv2.putText(
                        img, label,
                        (x1, max(y1 - 10, 25)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7, (0, 0, 255), 2
                    )

        # =====================================================
        # SAFETY STATUS
        # =====================================================
        
        if phone_detected:
            safety_status = "WARNING"
            warning_message = f"⚠️ PHONE DETECTED! ({phone_count} phone(s))"
            
            # Red warning banner at top
            cv2.rectangle(img, (0, 0), (img.shape[1], 70), (0, 0, 255), -1)
            cv2.putText(
                img, "🚨 PHONE DETECTED 🚨",
                (20, 45),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0, (255, 255, 255), 2
            )
            
        elif person_count > 0:
            safety_status = "SAFE"
            warning_message = f"✓ Person detected. No phone. ({person_count} person)"
        else:
            safety_status = "NO PERSON"
            warning_message = "No person detected in frame"

        # =====================================================
        # ENCODE PROCESSED IMAGE
        # =====================================================
        
        success, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        if not success:
            return jsonify({
                "success": False,
                "message": "Could not encode image"
            }), 500

        image_base64 = base64.b64encode(buffer).decode("utf-8")

        # =====================================================
        # RESPONSE
        # =====================================================
        
        return jsonify({
            "success": True,
            "face_count": person_count,  # For frontend compatibility
            "phone_detected": phone_detected,
            "phone_count": phone_count,
            "person_count": person_count,
            "status": safety_status,
            "message": warning_message,
            "image": image_base64,
            "detections": detections
        })

    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting SmartVision on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)