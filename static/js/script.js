// =========================================================
// SMARTVISION PWA - UPDATED VERSION
// YOLO DETECTION WITH REAL-TIME DISPLAY
// =========================================================

// =========================================================
// DOM ELEMENTS
// =========================================================

const phoneStatus = document.getElementById("phoneStatus");
const safetyStatus = document.getElementById("safetyStatus");
const safetyBox = document.getElementById("safetyBox");
const warningBox = document.getElementById("warningBox");
const warningMessage = document.getElementById("warningMessage");
const camera = document.getElementById("camera");
const output = document.getElementById("output");
const canvas = document.getElementById("canvas");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const faceCount = document.getElementById("faceCount");
const fpsElement = document.getElementById("fps");
const detectionStatus = document.getElementById("detectionStatus");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const placeholder = document.getElementById("cameraPlaceholder");
const cameraOverlay = document.getElementById("cameraOverlay");
const overlayStatus = document.getElementById("overlayStatus");
const installBtn = document.getElementById("installBtn");

// =========================================================
// STATE VARIABLES
// =========================================================

let stream = null;
let running = false;
let processing = false;
let currentFacingMode = "user";
let lastFrameTime = performance.now();
let frameCounter = 0;
let lastWarningTime = 0;
let deferredPrompt = null;

// =========================================================
// UTILITY
// =========================================================

function elementExists(element) {
    return element !== null && element !== undefined;
}

// =========================================================
// PWA INSTALL PROMPT
// =========================================================

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (elementExists(installBtn)) {
        installBtn.style.display = "inline-flex";
    }
});

if (elementExists(installBtn)) {
    installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        try {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            console.log("PWA install result:", result.outcome);
        } catch (error) {
            console.error("PWA install error:", error);
        }
        deferredPrompt = null;
        installBtn.style.display = "none";
    });
}

window.addEventListener("appinstalled", () => {
    console.log("✓ SmartVision installed");
    if (elementExists(installBtn)) {
        installBtn.style.display = "none";
    }
});

// =========================================================
// START CAMERA
// =========================================================

if (elementExists(startBtn)) {
    startBtn.addEventListener("click", startCamera);
}

async function startCamera() {
    try {
        if (stream) stopExistingStream();

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API not supported");
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 960 },
                facingMode: currentFacingMode
            },
            audio: false
        });

        camera.srcObject = stream;
        await camera.play();

        // Show camera, hide placeholder
        camera.style.display = "block";
        output.style.display = "none";
        placeholder.style.display = "none";
        cameraOverlay.style.display = "flex";

        running = true;
        processing = false;

        startBtn.disabled = true;
        stopBtn.disabled = false;
        switchCameraBtn.disabled = false;

        statusText.textContent = "Camera Active";
        statusDot.style.background = "#22c55e";
        detectionStatus.textContent = "ON";
        detectionStatus.style.color = "#16a34a";
        overlayStatus.textContent = "AI Monitoring...";

        frameCounter = 0;
        lastFrameTime = performance.now();

        // Start detection loop
        processFrame();

    } catch (error) {
        console.error("Camera error:", error);
        let message = "Unable to access camera.";

        if (error.name === "NotAllowedError") {
            message = "Camera permission denied. Please allow camera access.";
        } else if (error.name === "NotFoundError") {
            message = "No camera found on this device.";
        } else if (error.name === "NotReadableError") {
            message = "Camera is in use by another app.";
        } else if (error.name === "SecurityError") {
            message = "Camera requires HTTPS or localhost.";
        }

        alert(message);
    }
}

// =========================================================
// STOP CAMERA
// =========================================================

if (elementExists(stopBtn)) {
    stopBtn.addEventListener("click", stopCamera);
}

function stopCamera() {
    running = false;
    processing = false;
    stopExistingStream();

    camera.srcObject = null;
    camera.style.display = "none";
    output.style.display = "none";
    placeholder.style.display = "block";
    cameraOverlay.style.display = "none";

    startBtn.disabled = false;
    stopBtn.disabled = true;
    switchCameraBtn.disabled = false;

    statusText.textContent = "Camera Off";
    statusDot.style.background = "#ef4444";

    faceCount.textContent = "0";
    phoneStatus.textContent = "None";
    phoneStatus.style.color = "";
    safetyStatus.textContent = "OFF";
    safetyBox.classList.remove("warning-active");
    fpsElement.textContent = "0";
    detectionStatus.textContent = "OFF";
    detectionStatus.style.color = "";
    warningBox.style.display = "none";
    warningMessage.textContent = "No warning";
    overlayStatus.textContent = "AI Monitoring";

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}

// =========================================================
// STOP EXISTING STREAM
// =========================================================

function stopExistingStream() {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
    stream = null;
}

// =========================================================
// SWITCH CAMERA
// =========================================================

if (elementExists(switchCameraBtn)) {
    switchCameraBtn.addEventListener("click", switchCamera);
}

async function switchCamera() {
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";

    if (!running) return;

    try {
        stopExistingStream();

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 960 },
                facingMode: currentFacingMode
            },
            audio: false
        });

        camera.srcObject = stream;
        await camera.play();
        console.log("✓ Camera switched to:", currentFacingMode);

    } catch (error) {
        console.error("Camera switch error:", error);
        alert("Could not switch camera.");
    }
}

// =========================================================
// PROCESS FRAME - MAIN DETECTION LOOP
// =========================================================

async function processFrame() {
    if (!running) return;

    // Check if video is ready
    if (camera.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (!processing) {
            processing = true;

            try {
                const width = camera.videoWidth;
                const height = camera.videoHeight;

                if (width === 0 || height === 0) {
                    processing = false;
                    setTimeout(processFrame, 50);
                    return;
                }

                // Setup canvas
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(camera, 0, 0, width, height);

                // Convert to JPEG
                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, "image/jpeg", 0.7);
                });

                if (!blob) throw new Error("Could not create blob");

                // Send to backend
                const formData = new FormData();
                formData.append("frame", blob, "frame.jpg");

                const response = await fetch("/detect", {
                    method: "POST",
                    body: formData,
                    signal: AbortSignal.timeout(5000)
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    // =====================================================
                    // DISPLAY ANNOTATED IMAGE
                    // =====================================================
                    
                    if (data.image) {
                        output.src = "data:image/jpeg;base64," + data.image;
                        output.style.display = "block";
                        camera.style.display = "none";
                    }

                    // =====================================================
                    // UPDATE STATISTICS
                    // =====================================================
                    
                    if (data.face_count !== undefined) {
                        faceCount.textContent = data.face_count || data.person_count || 0;
                    }

                    // Phone detection
                    if (data.phone_detected === true) {
                        phoneStatus.textContent = `Detected (${data.phone_count})`;
                        phoneStatus.style.color = "#dc2626";
                    } else {
                        phoneStatus.textContent = "None";
                        phoneStatus.style.color = "#16a34a";
                    }

                    // Safety status
                    const status = data.status || "SAFE";
                    safetyStatus.textContent = status;

                    if (status === "WARNING") {
                        safetyBox.classList.add("warning-active");
                        warningBox.style.display = "block";
                        warningMessage.textContent = data.message || "Mobile phone detected!";
                        overlayStatus.textContent = "🚨 PHONE DETECTED";
                        playWarning();
                    } else {
                        safetyBox.classList.remove("warning-active");
                        warningBox.style.display = "none";
                        warningMessage.textContent = data.message || "Monitoring...";
                        overlayStatus.textContent = "✓ Monitoring";
                    }

                    // =====================================================
                    // FPS COUNTER
                    // =====================================================
                    
                    frameCounter++;
                    const currentTime = performance.now();
                    const elapsed = currentTime - lastFrameTime;

                    if (elapsed >= 1000) {
                        fpsElement.textContent = frameCounter;
                        frameCounter = 0;
                        lastFrameTime = currentTime;
                    }

                } else {
                    console.warn("Backend error:", data.message);
                }

            } catch (error) {
                console.error("Detection error:", error);
                if (error.name !== "AbortError") {
                    detectionStatus.textContent = "ERROR";
                    detectionStatus.style.color = "#dc2626";
                }
            } finally {
                processing = false;
            }
        }
    }

    // Continue detection loop - FASTER RATE (100ms = ~10 FPS)
    if (running) {
        setTimeout(processFrame, 100);
    }
}

// =========================================================
// PLAY WARNING
// =========================================================

function playWarning() {
    const now = Date.now();

    // Cooldown: only warn every 3 seconds
    if (now - lastWarningTime < 3000) {
        return;
    }

    lastWarningTime = now;

    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(
        "Warning! Mobile phone detected in the camera!"
    );

    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
}

// =========================================================
// PAGE EXIT
// =========================================================

window.addEventListener("beforeunload", () => {
    stopExistingStream();
});

// =========================================================
// PAGE VISIBILITY
// =========================================================

document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
        console.log("Page hidden - pausing detection");
        running = false;
    }
});