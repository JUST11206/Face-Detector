// =========================================================
// SMARTVISION PWA
// YOLO DETECTION - RENDER COMPATIBLE VERSION
// =========================================================


// =========================================================
// DOM ELEMENTS
// =========================================================

const phoneStatus =
    document.getElementById("phoneStatus");

const safetyStatus =
    document.getElementById("safetyStatus");

const safetyBox =
    document.getElementById("safetyBox");

const warningBox =
    document.getElementById("warningBox");

const warningMessage =
    document.getElementById("warningMessage");

const camera =
    document.getElementById("camera");

const output =
    document.getElementById("output");

const canvas =
    document.getElementById("canvas");

const startBtn =
    document.getElementById("startBtn");

const stopBtn =
    document.getElementById("stopBtn");

const switchCameraBtn =
    document.getElementById("switchCameraBtn");

const faceCount =
    document.getElementById("faceCount");

const fpsElement =
    document.getElementById("fps");

const detectionStatus =
    document.getElementById("detectionStatus");

const statusDot =
    document.getElementById("statusDot");

const statusText =
    document.getElementById("statusText");

const placeholder =
    document.getElementById("cameraPlaceholder");

const cameraOverlay =
    document.getElementById("cameraOverlay");

const overlayStatus =
    document.getElementById("overlayStatus");

const installBtn =
    document.getElementById("installBtn");


// =========================================================
// STATE
// =========================================================

let stream = null;

let running = false;

let processing = false;

let currentFacingMode = "user";

let frameCounter = 0;

let lastFrameTime = performance.now();

let lastWarningTime = 0;

let deferredPrompt = null;


// =========================================================
// SETTINGS
// =========================================================

// Render CPU server ke liye
// 100ms / 10 FPS bahut aggressive tha.
//
// 1000ms = approximately 1 detection request/sec.
//
const DETECTION_INTERVAL = 1000;

// Render par YOLO inference slow ho sakta hai.
// 20 seconds timeout.
//
const REQUEST_TIMEOUT = 20000;


// =========================================================
// UTILITY
// =========================================================

function elementExists(element) {

    return (
        element !== null &&
        element !== undefined
    );

}


// =========================================================
// PWA INSTALL
// =========================================================

window.addEventListener(
    "beforeinstallprompt",
    (event) => {

        event.preventDefault();

        deferredPrompt = event;

        if (elementExists(installBtn)) {

            installBtn.style.display =
                "inline-flex";

        }

    }
);


if (elementExists(installBtn)) {

    installBtn.addEventListener(
        "click",
        async () => {

            if (!deferredPrompt) {

                console.log(
                    "PWA install prompt not available."
                );

                return;

            }

            try {

                deferredPrompt.prompt();

                const result =
                    await deferredPrompt.userChoice;

                console.log(
                    "PWA install result:",
                    result.outcome
                );

            } catch (error) {

                console.error(
                    "PWA install error:",
                    error
                );

            }

            deferredPrompt = null;

            installBtn.style.display =
                "none";

        }
    );

}


window.addEventListener(
    "appinstalled",
    () => {

        console.log(
            "✓ SmartVision installed"
        );

        if (elementExists(installBtn)) {

            installBtn.style.display =
                "none";

        }

    }
);


// =========================================================
// START BUTTON
// =========================================================

if (elementExists(startBtn)) {

    startBtn.addEventListener(
        "click",
        startCamera
    );

}


// =========================================================
// START CAMERA
// =========================================================

async function startCamera() {

    console.log(
        "================================="
    );

    console.log(
        "Starting SmartVision camera..."
    );

    console.log(
        "================================="
    );


    try {

        // Stop previous stream
        if (stream) {

            stopExistingStream();

        }


        // Check browser support
        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera API not supported by this browser."
            );

        }


        // =====================================================
        // GET CAMERA
        // =====================================================

        stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    },

                    facingMode:
                        currentFacingMode

                },

                audio: false

            });


        console.log(
            "✓ Camera stream received"
        );


        // =====================================================
        // CONNECT STREAM
        // =====================================================

        camera.srcObject =
            stream;


        await camera.play();


        console.log(
            "✓ Video playback started"
        );


        // =====================================================
        // UI
        // =====================================================

        camera.style.display =
            "block";

        output.style.display =
            "none";

        placeholder.style.display =
            "none";

        cameraOverlay.style.display =
            "flex";


        // =====================================================
        // STATE
        // =====================================================

        running = true;

        processing = false;

        frameCounter = 0;

        lastFrameTime =
            performance.now();


        // =====================================================
        // BUTTONS
        // =====================================================

        startBtn.disabled =
            true;

        stopBtn.disabled =
            false;

        switchCameraBtn.disabled =
            false;


        // =====================================================
        // STATUS
        // =====================================================

        statusText.textContent =
            "Camera Active";

        statusDot.style.background =
            "#22c55e";

        detectionStatus.textContent =
            "ON";

        detectionStatus.style.color =
            "#16a34a";

        overlayStatus.textContent =
            "AI Monitoring...";


        // =====================================================
        // START DETECTION
        // =====================================================

        console.log(
            "✓ Starting YOLO detection loop..."
        );

        processFrame();


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        let message =
            "Unable to access camera.";


        if (
            error.name ===
            "NotAllowedError"
        ) {

            message =
                "Camera permission denied. Please allow camera access.";

        } else if (
            error.name ===
            "NotFoundError"
        ) {

            message =
                "No camera found on this device.";

        } else if (
            error.name ===
            "NotReadableError"
        ) {

            message =
                "Camera is already being used by another application.";

        } else if (
            error.name ===
            "SecurityError"
        ) {

            message =
                "Camera requires HTTPS.";

        }


        alert(message);

    }

}


// =========================================================
// STOP BUTTON
// =========================================================

if (elementExists(stopBtn)) {

    stopBtn.addEventListener(
        "click",
        stopCamera
    );

}


// =========================================================
// STOP CAMERA
// =========================================================

function stopCamera() {

    console.log(
        "Stopping SmartVision..."
    );


    running = false;

    processing = false;


    stopExistingStream();


    camera.srcObject =
        null;


    // =====================================================
    // UI
    // =====================================================

    camera.style.display =
        "none";

    output.style.display =
        "none";

    placeholder.style.display =
        "block";

    cameraOverlay.style.display =
        "none";


    // =====================================================
    // BUTTONS
    // =====================================================

    startBtn.disabled =
        false;

    stopBtn.disabled =
        true;

    switchCameraBtn.disabled =
        false;


    // =====================================================
    // STATUS
    // =====================================================

    statusText.textContent =
        "Camera Off";

    statusDot.style.background =
        "#ef4444";


    faceCount.textContent =
        "0";


    phoneStatus.textContent =
        "None";


    phoneStatus.style.color =
        "";


    safetyStatus.textContent =
        "OFF";


    safetyBox.classList.remove(
        "warning-active"
    );


    fpsElement.textContent =
        "0";


    detectionStatus.textContent =
        "OFF";


    detectionStatus.style.color =
        "";


    warningBox.style.display =
        "none";


    warningMessage.textContent =
        "No warning";


    overlayStatus.textContent =
        "AI Monitoring";


    // =====================================================
    // STOP SPEECH
    // =====================================================

    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();

    }


    console.log(
        "✓ Camera stopped"
    );

}


// =========================================================
// STOP EXISTING STREAM
// =========================================================

function stopExistingStream() {

    if (!stream) {

        return;

    }


    stream
        .getTracks()
        .forEach(
            track => {

                track.stop();

            }
        );


    stream = null;


    console.log(
        "✓ Existing camera stream stopped"
    );

}


// =========================================================
// SWITCH CAMERA
// =========================================================

if (
    elementExists(switchCameraBtn)
) {

    switchCameraBtn.addEventListener(
        "click",
        switchCamera
    );

}


async function switchCamera() {

    if (!running) {

        return;

    }


    console.log(
        "Switching camera..."
    );


    currentFacingMode =
        currentFacingMode === "user"
            ? "environment"
            : "user";


    try {

        // Stop current camera
        stopExistingStream();


        // Get new camera
        stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    },

                    facingMode:
                        currentFacingMode

                },

                audio: false

            });


        camera.srcObject =
            stream;


        await camera.play();


        console.log(
            "✓ Camera switched to:",
            currentFacingMode
        );


    } catch (error) {

        console.error(
            "Camera switch error:",
            error
        );


        alert(
            "Could not switch camera."
        );

    }

}


// =========================================================
// MAIN YOLO DETECTION LOOP
// =========================================================

async function processFrame() {

    if (!running) {

        return;

    }


    // =====================================================
    // VIDEO READY CHECK
    // =====================================================

    if (
        camera.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        console.log(
            "Video not ready yet..."
        );


        if (running) {

            setTimeout(
                processFrame,
                500
            );

        }

        return;

    }


    // =====================================================
    // PREVENT MULTIPLE REQUESTS
    // =====================================================

    if (processing) {

        console.log(
            "Previous detection still running..."
        );


        if (running) {

            setTimeout(
                processFrame,
                DETECTION_INTERVAL
            );

        }

        return;

    }


    processing = true;


    try {

        // =================================================
        // VIDEO DIMENSIONS
        // =================================================

        const width =
            camera.videoWidth;

        const height =
            camera.videoHeight;


        if (
            width === 0 ||
            height === 0
        ) {

            console.warn(
                "Video dimensions are zero."
            );

            processing = false;


            if (running) {

                setTimeout(
                    processFrame,
                    500
                );

            }

            return;

        }


        console.log(
            `Processing frame: ${width}x${height}`
        );


        // =================================================
        // CANVAS
        // =================================================

        canvas.width =
            width;

        canvas.height =
            height;


        const ctx =
            canvas.getContext("2d");


        ctx.drawImage(
            camera,
            0,
            0,
            width,
            height
        );


        // =================================================
        // CREATE JPEG
        // =================================================

        const blob =
            await new Promise(
                resolve => {

                    canvas.toBlob(
                        resolve,
                        "image/jpeg",
                        0.70
                    );

                }
            );


        if (!blob) {

            throw new Error(
                "Could not create image blob."
            );

        }


        console.log(
            `Frame created: ${(blob.size / 1024).toFixed(1)} KB`
        );


        // =================================================
        // FORM DATA
        // =================================================

        const formData =
            new FormData();


        formData.append(
            "frame",
            blob,
            "frame.jpg"
        );


        // =================================================
        // SEND TO FLASK
        // =================================================

        console.log(
            "Sending frame to /detect..."
        );


        const controller =
            new AbortController();


        const timeoutId =
            setTimeout(
                () => {

                    controller.abort();

                },
                REQUEST_TIMEOUT
            );


        const response =
            await fetch(
                "/detect",
                {

                    method: "POST",

                    body: formData,

                    signal:
                        controller.signal

                }
            );


        clearTimeout(
            timeoutId
        );


        console.log(
            "Backend response:",
            response.status
        );


        // =================================================
        // HTTP ERROR
        // =================================================

        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "Backend HTTP error:",
                errorText
            );


            throw new Error(
                `Server error: ${response.status}`
            );

        }


        // =================================================
        // JSON
        // =================================================

        const data =
            await response.json();


        console.log(
            "YOLO response:",
            data
        );


        // =================================================
        // SUCCESS
        // =================================================

        if (!data.success) {

            console.error(
                "Backend detection failed:",
                data.message
            );


            detectionStatus.textContent =
                "ERROR";


            detectionStatus.style.color =
                "#dc2626";


            return;

        }


        // =================================================
        // DETECTION STATUS
        // =================================================

        detectionStatus.textContent =
            "ON";

        detectionStatus.style.color =
            "#16a34a";


        // =================================================
        // DISPLAY YOLO IMAGE
        // =================================================

        if (data.image) {

            output.src =
                "data:image/jpeg;base64," +
                data.image;


            /*
             * Important:
             *
             * We DO NOT hide the camera permanently.
             *
             * The processed YOLO image is displayed
             * as the latest detection result.
             */

            output.style.display =
                "block";

        }


        // =================================================
        // PERSON COUNT
        // =================================================

        const persons =
            data.person_count !== undefined
                ? data.person_count
                : (
                    data.face_count !== undefined
                        ? data.face_count
                        : 0
                );


        faceCount.textContent =
            persons;


        // =================================================
        // PHONE DETECTION
        // =================================================

        const phoneDetected =
            data.phone_detected === true;


        const phoneCount =
            data.phone_count || 0;


        if (phoneDetected) {

            phoneStatus.textContent =
                `Detected (${phoneCount})`;


            phoneStatus.style.color =
                "#dc2626";

        } else {

            phoneStatus.textContent =
                "None";


            phoneStatus.style.color =
                "#16a34a";

        }


        // =================================================
        // SAFETY STATUS
        // =================================================

        const status =
            data.status || "SAFE";


        safetyStatus.textContent =
            status;


        if (
            status === "WARNING"
        ) {

            // Add warning style
            safetyBox.classList.add(
                "warning-active"
            );


            warningBox.style.display =
                "block";


            warningMessage.textContent =
                data.message ||
                "Mobile phone detected!";


            overlayStatus.textContent =
                "PHONE DETECTED";


            // Voice warning
            playWarning();


        } else {

            safetyBox.classList.remove(
                "warning-active"
            );


            warningBox.style.display =
                "none";


            warningMessage.textContent =
                data.message ||
                "Monitoring...";


            overlayStatus.textContent =
                "✓ Monitoring";

        }


        // =================================================
        // FPS
        // =================================================

        frameCounter++;


        const currentTime =
            performance.now();


        const elapsed =
            currentTime -
            lastFrameTime;


        if (
            elapsed >= 1000
        ) {

            fpsElement.textContent =
                frameCounter;


            frameCounter = 0;


            lastFrameTime =
                currentTime;

        }


        // =================================================
        // DEBUG
        // =================================================

        console.log(
            "Detection:",
            {
                persons: persons,
                phones: phoneCount,
                phoneDetected: phoneDetected,
                status: status
            }
        );


    } catch (error) {

        console.error(
            "Detection error:",
            error
        );


        // AbortError = timeout
        if (
            error.name ===
            "AbortError"
        ) {

            console.error(
                "YOLO request timed out after",
                REQUEST_TIMEOUT,
                "ms"
            );

        }


        detectionStatus.textContent =
            "ERROR";


        detectionStatus.style.color =
            "#dc2626";


    } finally {

        processing = false;

    }


    // =====================================================
    // NEXT FRAME
    // =====================================================

    if (running) {

        setTimeout(
            processFrame,
            DETECTION_INTERVAL
        );

    }

}


// =========================================================
// VOICE WARNING
// =========================================================

function playWarning() {

    const now =
        Date.now();


    // Only warn every 3 seconds
    if (
        now - lastWarningTime <
        3000
    ) {

        return;

    }


    lastWarningTime =
        now;


    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }


    try {

        window.speechSynthesis.cancel();


        const speech =
            new SpeechSynthesisUtterance(
                "Warning! Mobile phone detected in the camera."
            );


        speech.rate =
            1;

        speech.pitch =
            1;

        speech.volume =
            1;


        window.speechSynthesis.speak(
            speech
        );


    } catch (error) {

        console.error(
            "Speech error:",
            error
        );

    }

}


// =========================================================
// PAGE EXIT
// =========================================================

window.addEventListener(
    "beforeunload",
    () => {

        running = false;

        processing = false;

        stopExistingStream();

    }
);


// =========================================================
// PAGE VISIBILITY
// =========================================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            if (running) {

                console.log(
                    "Page hidden - pausing detection"
                );

                running = false;

            }

        }

    }
);


// =========================================================
// INITIAL STATUS
// =========================================================

console.log(
    "================================="
);

console.log(
    "SmartVision YOLO JS loaded"
);

console.log(
    "Detection interval:",
    DETECTION_INTERVAL,
    "ms"
);

console.log(
    "Request timeout:",
    REQUEST_TIMEOUT,
    "ms"
);

console.log(
    "================================="
);